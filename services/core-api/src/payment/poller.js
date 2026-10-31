const API_URL = 'https://my.sepay.vn/userapi/transactions/list';
const POLL_INTERVAL_MS = 20_000;
const LOOKBACK_DAYS = 7;
const LIMIT = 5000;

function dateMinimum(now) {
  return new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
}
function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
function inboundAmount(value) {
  if (!/^\d+(?:\.0{1,2})?$/.test(String(value))) return null;
  return positiveInteger(value);
}
function normalizeTransaction(transaction) {
  const id = positiveInteger(transaction?.id);
  const transferAmount = inboundAmount(transaction?.amount_in);
  if (!id || !transferAmount || Number(transaction?.amount_out || 0) !== 0) return null;
  return { id, accountNumber: String(transaction.account_number || ''), transferType: 'in',
    transferAmount, content: String(transaction.transaction_content || '') };
}
function createSepayPoller(paymentService, config, { fetchImpl = fetch, now = () => new Date(), logger = console } = {}) {
  let running = false;
  let timer;
  async function poll() {
    if (running) return;
    running = true;
    try {
      const url = new URL(API_URL);
      url.searchParams.set('account_number', config.accountNumber);
      url.searchParams.set('transaction_date_min', dateMinimum(now()));
      url.searchParams.set('limit', String(LIMIT));
      const response = await fetchImpl(url, { headers: { Authorization: 'Bearer ' + config.apiToken,
        Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('SePay API HTTP ' + response.status);
      const data = await response.json();
      if (data.status !== 200 || data.messages?.success !== true || !Array.isArray(data.transactions)) {
        throw new Error('SePay API returned an invalid response');
      }
      if (data.transactions.length >= LIMIT) logger.warn('SePay transaction window reached its limit; reduce the polling interval or lookback');
      for (const transaction of data.transactions) {
        const payload = normalizeTransaction(transaction);
        if (payload && payload.accountNumber === config.accountNumber) await paymentService.receiveSepay(payload);
      }
    } catch (error) {
      logger.error('SePay polling failed: ' + (error instanceof Error ? error.message : 'unknown error'));
    } finally { running = false; }
  }
  return {
    start() {
      if (!config.apiToken || timer) return;
      void poll();
      timer = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
      timer.unref?.();
    },
    stop() { if (timer) clearInterval(timer); timer = undefined; },
    poll,
  };
}
module.exports = { createSepayPoller, normalizeTransaction };
