# SherPay

Invoice, expense, and cash-flow app for freelancers and SMEs — rebuilt from the live deployment at [sherpay.vercel.app](https://sherpay.vercel.app).

## Features

- **Dashboard** — outstanding AR, monthly collections, expenses, net profit, 6-month cash flow, invoice pipeline, awaiting payment, activity feed
- **Invoices** — create/draft/send, multi-currency (GHS/USD/EUR/GBP), line items, tax, partial payments, overdue detection, print/PDF view with MoMo + bank details
- **Expenses** — categorized receipts with monthly rollup into profit
- **Clients** — CRM-lite with billed / outstanding stats
- **Activity** — auto-logged trail (payments, reminders, receipts, expenses)
- **Settings** — company profile, MoMo/bank payment details, demo data reset
- **Local-first** — all data persists in `localStorage` (no backend required)

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## Develop

```bash
cd sherpay
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

Point a Vercel project at the `sherpay/` directory (Root Directory = `sherpay`), or deploy from this folder with the Vercel CLI.

## Demo data

Seed data mirrors the production dashboard (Accra Craft Markets, TechHub East London, Mensah & Co. Legal, Volta Foods, etc.). Reset anytime from **Settings → Reset to demo seed**.
