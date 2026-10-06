# Shop Admin Web and Work Shift

## Components

- `apps/admin-web`: React/Vite login, catalog and shift screens. Auth URL and Core API URL are configured with `VITE_AUTH_API_URL` and `VITE_CORE_API_URL`.
- Auth Service: `POST /auth/login`; Admin Web accepts only `shop_admin` and keeps the token in session storage.
- Core API: existing Branch/Service/Stylist routes plus `work_shifts` persistence, Work Shift CRUD and public `GET /time-slots`.
- Mobile booking adapter: `apps/mobile/src/booking/http-adapter.ts`; reads real catalog/slots and requires a Customer JWT when booking.

## Work Shift contract

Each shift has `branchId`, Stylist `userId`, local `date` (`YYYY-MM-DD`), and `startAt`/`endAt` ISO 8601 values with timezone. A shift belongs to one local calendar day. Same-stylist overlaps are rejected. Editing or deleting a shift is rejected with 409 when an active Appointment would fall outside or lose its shift. A branch cannot be deleted while it has shifts; a stylist assignment cannot be moved or removed while that stylist has shifts.

`GET /time-slots?branchId=&serviceId=&stylistId=&date=` creates future slots with the selected Service duration and excludes times overlapping `booked`, `completed`, or `paid` appointments. Booking submits the same branch, service, stylist userId and exact start/end; Core validates service duration and shift containment before applying the calendar overlap guard.

## Run and verify

Start MongoDB, Auth Service and Core API, then follow `apps/admin-web/README.md`. Configure mobile API URLs in `apps/mobile/.env.example` (Android Emulator: `10.0.2.2`; physical device: computer LAN address).

Core checks: `npm test`, `node --env-file-if-exists=.env --test test/catalog.test.js`, and `npm run test:work-shifts:integration` under `services/core-api`. Admin build: `npm run build` under `apps/admin-web`. Mobile checks: `npm run typecheck`, `npm run test:appointments` and `npm run export:android` under `apps/mobile`.

## Backlog status

SHINE-12 now has the Admin Web login, catalog CRUD, stylist assignment and Work Shift screens. SHINE-06 has Work Shift storage/CRUD and slot generation. Mobile can read those slots and create bookings; Customer appointment listing, Stylist shift schedule screens and payment remain outside this implementation.
