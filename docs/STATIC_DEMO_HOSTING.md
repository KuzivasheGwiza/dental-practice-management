# Optional public portfolio demo — review before publishing

This guide prepares a **static React fictional-data demonstration** for deployment via Netlify. **It does not publish the site, deploy the Angular/.NET application, or connect a real patient database.** Do not start a public deployment without checking image rights and any relevant client approvals.

## Why this separate demo

The repository contains two applications:
- `frontend/dentalcare-react/`: Vite/React, browser-only fictional demo data (simulated authentication, appointments and payments)
- `frontend/dental-practice-ui/` + `backend/DentalPractice.API/`: connected Angular/.NET/SQL Server solution **still in development**

Only the **React demonstration** is eligible for this static hosting recipe.

## How to deploy after approval

1. Review the browser demo locally using fictional data: `cd frontend/dentalcare-react && npm ci && npm run build && npm run dev`.
2. Confirm all visible logos, stock illustrations, photographs and other assets are either your work, licensed for public hosting, or approved for your use. Check `frontend/dentalcare-react/README.md` for existing attributions.
3. Confirm any client approval needed for public presentation. The demo uses a **fictional DentalCare brand** and sample South African address; do not misrepresent it as the live Zimbabwean practice.
4. Review that no real patient, staff, appointment, clinical, payment or identity information is included. Try the login and booking flow with fictional demo accounts only.
5. Sign into Netlify and choose **Add new project → Import an existing project → GitHub**. Select `KuzivasheGwiza/dental-practice-management`.
6. The repository-root `netlify.toml` configures the build base as `frontend/dentalcare-react`, command `npm ci && npm run build` and publish folder `dist` (relative to base). Review Netlify's detected settings against these.
7. Approve the deployment in Netlify. Verify `/`, `/services`, `/login`, `/portal` and `/staff` using fictional accounts, including refreshing a deep link.
8. Once verified, add the **real deployment URL** to the GitHub README, profile README and CV/portfolio as a clearly labelled **React simulated demo**. Do not invent or publish a link before it works.

## Safety boundaries

- The site uses `localStorage`. Every visitor's browser may save their own entered values locally; **tell visitors not to enter real personal or clinical details**.
- The login/role controls and payments are **simulations**, not backend authentication, payment processing or real booking.
- Do not put API keys or private configurations into Vite environment variables; browser bundles are publicly readable.
- Do not use this demonstration to collect real patient bookings or payments.
- A public static demo is **not** evidence of production readiness for the connected app.
- Disconnect/pause Netlify's auto-publishing if you do not intend later repository commits to republish the public site automatically.

## Verification checklist

- [ ] Client/asset publication rights reviewed
- [ ] Sample phone/email/address clearly fictional
- [ ] React build and navigation work on hosted domain
- [ ] Direct URL refreshes work (Netlify SPA rewrite)
- [ ] Demo banner visible and privacy wording accurate
- [ ] Payment actions visibly simulated
- [ ] Browser reset clears fictional demo data
- [ ] Public site does not access private API or database
- [ ] Real URL added to portfolio **only after** launch and testing

Related: [repository README](../README.md), [case study](CASE_STUDY.md), [demo walkthrough](PORTFOLIO_DEMO.md), [deployment checklist for the full app](DEPLOYMENT_CHECKLIST.md).
