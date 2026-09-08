# Keeps

Wallet-first stamp cards for local shops. Customers join with a QR, the card lands in Apple Wallet or Google Wallet, staff stamp from a phone, and the shop can send Wallet push plus email.

## Local setup

1. Copy `.env.example` to `.env` and set `AUTH_SECRET` (`openssl rand -base64 32`).
2. Install Node 22+, then:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).
4. Merchant login: `owner@keeps.local` / `keeps-demo`.
5. Customer join: [http://localhost:3000/join/demo-cafe](http://localhost:3000/join/demo-cafe).

Without Apple/Google/Resend credentials the product runs in **demo mode**: cards are issued in the database, the join page shows a preview with a scannable QR, and stamp/redeem still updates counts. Emails print a subject line to the server log instead of sending.

## Go live

You hold one Apple Pass Type ID and one Google Wallet issuer for every shop.

- Apple Developer Program, Pass Type ID, signing certificate, WWDR cert (base64 in env), HTTPS `APP_URL`
- Google Cloud Wallet API + issuer account; paste the service account JSON into `GOOGLE_SERVICE_ACCOUNT_JSON`
- Resend domain (SPF/DKIM) for magic-link login and campaigns

## Product map

- `/` marketing
- `/login` merchant auth
- `/dashboard` stats + join QR
- `/stamp` camera stamp pad
- `/customers` list
- `/campaigns` Wallet push + opted-in email
- `/join/[slug]` public enrollment
