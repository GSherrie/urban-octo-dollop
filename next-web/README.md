This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

## SherPay — Supabase + Resend setup

This app is designed to sit behind a real Supabase project with Resend handling email.

Target architecture:

- GitHub (source)
- Vercel (app hosting)
- Supabase (Auth + Database)
- Resend (verification emails, OTPs, password resets, SherPay notifications)

### 1. Supabase project

1. Install the Supabase CLI locally:
   - https://supabase.com/docs/guides/cli/getting-started
2. Log in:
   - `supabase login`
3. Link the local project to the remote project:
   - `cd next-web`
   - `supabase link --project-ref jmmrcrnfwyrbejhechke`

### 2. Environment variables

1. Copy the example env file:
   - `cp .env.example .env.local`
2. Fill in the values from your Supabase project and Resend account:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM`
   - optional: `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`

Do not commit real secrets to the repository. On Vercel, add these as project Environment Variables.

### 3. Database schema

The local schema lives in:

- `supabase/migrations/20240101000000_init.sql`

It creates:

- `public.profiles`
- `public.categories`
- `public.expenses`
- `public.income`
- `public.transactions`

With RLS policies, `updated_at` triggers, and an auth-triggered profile creation helper.

Local dev:

- `supabase start`

Push schema to the remote project only after you have reviewed it:

- `supabase db push`

### 4. Auth email via Resend

The recommended path for verification, OTP, and password reset emails is Supabase Auth SMTP/Resend integration from the Supabase dashboard.

If you want a custom email path for verification resends or app notifications, this repo includes:

- `supabase/functions/resend-verification/index.ts`
- `lib/email/provider.ts`
- `lib/email/send-verification.ts`
- `lib/notify/index.ts`

Local function dev:

- `supabase functions serve resend-verification`

Deploy the function when ready:

- `supabase functions deploy resend-verification`

### 5. Deploy

1. Push the app to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.

After deploy, confirm:

- signup sends a verification email,
- password reset sends a reset email,
- app notifications can be sent from server-side code via Resend.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
