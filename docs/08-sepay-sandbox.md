# SePay sandbox payments — SHINE-08 / SHINE-09

SePay sandbox replaces the mock payment action when `PAYMENT_PROVIDER=sepay`.
Live transfers are deliberately unsupported. Mobile uses the existing authenticated
Customer flow: Lịch hẹn → completed appointment → Thanh toán SePay.

The user selected SePay sandbox in place of the original MoMo/VNPay mock scope.
The Notion cards still describe MoMo/VNPay; they require an authenticated editor
to align their scope and attach review evidence. Do not mark them Done solely
because code has been pushed.

## Failure, cancellation and retry

The payment screen includes clearly labelled sandbox failure and cancellation
controls. `POST /payments/:appointmentId/sandbox-outcome` accepts exactly one
`status` field (`failed`, `cancelled`, or `pending` to retry), with the owner's
Customer JWT. This route is mounted only when sandbox controls are enabled;
normal startup enables it only for `SEPAY_MODE=sandbox`.
No client action can set `paid`. Failed/cancelled attempts leave the appointment
completed. Retry preserves the reference and frozen price. A valid delayed webhook
can still settle a failed/cancelled attempt: cancelling the test UI does not cancel
a bank transfer. Once paid, the failure/cancellation endpoint returns 409.

Acceptance evidence: 115 existing Core tests, Mongo payment lifecycle integration,
17 mobile tests, TypeScript checking and Android bundle export. Browser payment success was verified
using a synthetic webhook through the tunnel. Android device runtime/video and
actual SePay dashboard dispatch remain unverified; no Android SDK/adb was found
in PATH or the default SDK installation location on this machine.

## Local setup

Install dependencies with `npm ci` in `services/auth-service`, `services/core-api`
and `apps/mobile`. MongoDB must be running. Configure both services with the same
random `JWT_SECRET`; copy the Core `.env.example` and fill the sandbox account and
webhook API key. Use separate sandbox databases. Never commit `.env` files.

Run `npm start` in each service, and `npm run web` in `apps/mobile`.
Set `EXPO_PUBLIC_AUTH_API_URL` and `EXPO_PUBLIC_CORE_API_URL` in the mobile `.env`
to the running services. Android emulator uses `10.0.2.2` instead of `localhost`;
a physical phone needs the computer's LAN address. API and webhook secrets must
never have the `EXPO_PUBLIC_` prefix.

For the prepared local session: Auth port 4101, Core port 4103, Expo web port 8081.
The isolated checkout is `.local/sepay-worktree` on branch `payment`.
Customer: `customer@30shine.vn` / `Password123!` (local sandbox only).
To add another completed demo appointment, set `DEMO_CUSTOMER_ID` in Core `.env`
and run `node --env-file=.env scripts/seed-payment-demo.js` in `services/core-api`.
Existing appointments, including paid ones, are never reset by the seed.

## SePay configuration

Keep the tunnel directed to Core port 4103. Set receiving URL to the tunnel HTTPS
origin plus `/webhooks/sepay`; the origin changes when a quick tunnel restarts.
In SePay Test mode select incoming transactions, JSON and API Key authentication.
Copy `SEPAY_WEBHOOK_API_KEY` into the webhook API Key field (not `SEPAY_API_TOKEN`).
Do not filter out transactions without recognized payment codes: the backend
extracts the full `SHINE` reference from transfer content. If using code filters,
configure SePay's payment code structure for prefix SHINE and 16 hex characters.

Create a payment in the app. In SePay → Test mode → Mô phỏng giao dịch, select the
configured test account, Tiền vào, and copy the exact amount and reference from
the payment screen. The screen polls every 3 seconds while focused and pending.
Leaving the screen does not cancel or settle a transfer. Reopening reuses the
same pending payment. The screen displays a VietQR image generated through SePay's
documented `https://vietqr.app/img` endpoint with the payment's account, bank,
amount and reference. Only those payment details are sent to the image service;
authentication secrets are never included. Loading failures show a retry control.
The sandbox account cannot receive real bank transfers: use SePay's simulation
to confirm payment. Displaying or scanning the QR never marks a payment paid.

## API and persistence

- `POST /payments` with Customer JWT and `{ "appointmentId": "..." }` returns
  `{ payment }`. Only the owner of a completed appointment can create it.
- `GET /payments/:appointmentId` returns that owner's payment.
- `POST /webhooks/sepay` requires `Authorization: Apikey <key>` and SePay JSON.
- Legacy `POST /appointments/:id/pay` returns 409 when SePay is enabled.

Amounts come from the appointment's catalog service at payment creation and are
then frozen. Client-supplied amounts are rejected. Incoming direction, gateway,
account, exact amount and unambiguous reference must match. Authenticated unmatched
events are acknowledged without settlement. Invalid authentication gets 401.

Payment is embedded in the calendar appointment. One Mongo update changes both
statuses to paid, so standalone Mongo works without replica-set transactions.
A globally unique provider transaction receipt prevents transaction reuse.
Receipts are written before settlement; retries repair an interruption between
these writes. Duplicate deliveries cannot charge or settle twice. Service price
snapshots at booking and live payment reconciliation remain outside this sandbox.

## Verification

From Core: `npm test` and `node --test test/payment.integration.js`.
The integration test uses `shine_payment_tests` on local Mongo, creates its own
records, and removes only those records. It covers ownership, pre-completion
rejection, amount tampering, gateway/account/reference checks, duplicate requests,
concurrent webhook replay, persistence, and atomic appointment/payment updates.
From mobile: `npm test` and `npm run typecheck`.

The browser flow was verified with an authenticated synthetic SePay payload sent
through the public tunnel: pending → paid → appointment paid. Actual dispatch from
the SePay dashboard still needs the user's logged-in sandbox session.
