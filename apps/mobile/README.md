# Mobile Expo — Customer + Stylist

Customer Booking Wizard follows Branch → Service → Stylist → date/slot → review → confirm. It loads active catalog entries from Core API, lists available slots generated from Work Shift, then signs in Customer and creates a persisted appointment.

## Environment and run

Requires Node.js 24 LTS, npm and Expo SDK 57. Configure API URLs by copying `.env.example` to `.env`:

```dotenv
EXPO_PUBLIC_CORE_API_URL=http://10.0.2.2:4102
EXPO_PUBLIC_AUTH_API_URL=http://10.0.2.2:4101
```

Use `localhost` for a local web/browser runtime. Android Emulator uses `10.0.2.2`; a physical device needs the computer's LAN IP. Start MongoDB, Auth Service and Core API, then:

```powershell
cd apps/mobile
npm ci
npm run android
```

At confirmation, sign in with an existing Customer account. The access token stays in memory for this app screen session. The role selector at the entry screen is only a UI navigation demo; backend JWT authorization remains authoritative.

## Checks

```powershell
npm run typecheck
npm run test:appointments
npm run export:android
```

`export:android` checks Metro/Hermes bundling; it does not create an APK or replace device testing.

## Current scope

- Customer: real catalog, Work Shift-derived slots and booking POST.
- Stylist schedule and Customer appointment list still use the existing demo/placeholder data sources.
- Booking source is `src/booking/http-adapter.ts`; the interface is `src/booking/types.ts`.
