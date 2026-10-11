const { timingSafeEqual } = require('node:crypto');
const { authenticate } = require('../middleware/auth');
const { BookingError } = require('../booking/rules');

function mountPayments(app, { repository, secret, webhookKey }) {
  if (!webhookKey) throw new Error('SEPAY_WEBHOOK_API_KEY is required');
  const handle = operation => async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { await operation(req, res); }
    catch (error) { if (error instanceof BookingError) return res.status(error.status).json({ error: error.message }); next(error); }
  };
  app.post('/webhooks/sepay', handle(async (req, res) => {
    const actual = Buffer.from(req.get('Authorization') || '');
    const expected = Buffer.from(`Apikey ${webhookKey}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ success: false });
    await repository.receive(req.body);
    res.json({ success: true });
  }));
  app.post('/payments', authenticate(secret), handle(async (req, res) => {
    if (!req.body || Object.keys(req.body).length !== 1 || !req.body.appointmentId) throw new BookingError(400, 'Only appointmentId is accepted');
    res.status(201).json({ payment: await repository.create(req.body.appointmentId, req.auth) });
  }));
  app.get('/payments/:appointmentId', authenticate(secret), handle(async (req, res) => {
    const payment = await repository.get(req.params.appointmentId, req.auth);
    if (!payment) throw new BookingError(404, 'Create a payment first');
    res.json({ payment });
  }));
  // Prevent the old mock route from bypassing SePay confirmation.
  app.post('/appointments/:id/pay', authenticate(secret), (_req, res) => res.status(409).json({ error: 'Create a SePay payment; confirmation comes from the webhook' }));
}
module.exports = { mountPayments };
