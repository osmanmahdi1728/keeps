# Keeps

Wallet-first stamp cards for local shops. Customers join with a QR, the card lands in Apple Wallet or Google Wallet, staff stamp from a phone, and the shop can send Wallet push plus email.

## Local setup

1. Copy `.env.example` to `.env` and set `AUTH_SECRET` (`openssl rand -base64 32`).
2. Paste the Neon `DATABASE_URL` from Vercel into `.env`.
3. Install Node 22+, then:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).
4. Merchant login: `owner@keeps.local` / `keeps-demo`.
5. Customer join: [http://localhost:3000/join/demo-cafe](http://localhost:3000/join/demo-cafe).

Without Apple/Google/Resend credentials the merchant studio runs in **preview mode**: card designs, direct join QR codes, enrollment, stamping, and browser previews work, but the customer is clearly told that Wallet installation is not active. Emails print a subject line to the server log instead of sending.

## Go live

Vercel + Neon: set `AUTH_SECRET` and set `APP_URL` to the Vercel URL (`https://keeps-two.vercel.app`). Leave `AUTH_URL` unset there — `trustHost` reads the origin from the request. `DATABASE_URL` comes from the Neon store. Each deploy runs `prisma db push` and seeds Demo Cafe (`owner@keeps.local` / `keeps-demo`).

The business importer searches OpenStreetMap through Nominatim and requires no
API key. Set `APP_URL` to the public deployment origin so requests identify this
app correctly. Connect a Vercel Blob store for `BLOB_READ_WRITE_TOKEN`; uploaded
photos are never written to the serverless filesystem. `OPENAI_API_KEY` enables
bilingual copy polish and the explicit no-real-photo image fallback. Website
imports accept only public HTTP(S) pages and imported facts always remain
editable before publishing.

Keeps holds one Apple Pass Type ID and one Google Wallet issuer for every shop. Merchants never need developer accounts, a customer app, or a Play Store listing.

- **Apple Wallet:** join the Apple Developer Program, register a Pass Type ID, create its Pass Type ID certificate/private key, and use the active G4 WWDR intermediate certificate. Store the PEM values as base64 in the `APPLE_*` variables. `APP_URL` must be public HTTPS.
- **Google Wallet:** create a Google Wallet API Issuer account in the Google Pay & Wallet console, complete the Business Profile, enable the Wallet API, create a service account, and add it as a developer. New issuers start in demo mode for named test accounts. After creating a class and screenshots, request publishing access; set `GOOGLE_WALLET_PUBLISHING_STATUS=live` only after approval.
- **No Play Store account is required.** Google Wallet passes are issued through the Wallet API and a signed save URL.
- Resend domain (SPF/DKIM) for magic-link login and campaigns

The customer flow is always:

`merchant QR → /join/{slug} → name + email → Add to Apple Wallet / Google Wallet`

The legacy `/website` builder and `/s/{slug}` storefront remain for existing data, but they are not part of the primary Wallet flow.

## Product map

- `/` marketing
- `/login` merchant auth
- `/dashboard` card preview, Wallet readiness, stats + direct join QR
- `/program` guided card design studio
- `/stamp` camera stamp pad
- `/customers` list
- `/campaigns` Wallet push + opted-in email
- `/join/[slug]` focused Wallet enrollment
