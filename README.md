# NIYOR FASHION — Yellow & Black Storefront

Responsive React + Vite storefront concept inspired by the requested black-and-yellow mobile design.

## Run locally
1. Extract the ZIP.
2. Open this folder in VS Code.
3. In Terminal run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the URL Vite prints, usually http://localhost:5173.

## Customize before client demo
- Replace demo products, images, prices and categories in `src/App.jsx` with approved brand details.
- Change `WHATSAPP_NUMBER` in `src/App.jsx` to the real number with country code and digits only.
- Replace the Instagram URL and confirm the brand's official links.
- Images are loaded from Unsplash and require internet access.
- Product cards offer Add to Bag and Buy Now. Checkout collects delivery details and offers Cash on Delivery or PhonePe Payment Gateway checkout. COD immediately adds an order to browser-local Order history; after PhonePe redirects back, the server checks the order status with PhonePe and moves it to history as paid only when PhonePe reports `COMPLETED`. Later shipping tracking stages are placeholders until a shipping service is connected.

## PhonePe Payment Gateway
1. Create PhonePe Payment Gateway API credentials for the sandbox or production account.
2. Set `PHONEPE_ENV`, `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, and `APP_BASE_URL` in the hosting provider's server-side environment settings. `APP_BASE_URL` must be the public HTTPS origin of this storefront in production.
3. For local use, copy `.env.example` to `.env.local` and fill in test credentials, then run the app through `npx vercel dev` so the `/api/phonepe/*` serverless functions run. `npm run dev` starts only Vite and does not run the payment API.
4. Keep PhonePe credentials on the server. Never put them in `VITE_*` variables or frontend code.

The payment status is independently checked through the server-side PhonePe API after redirect; the redirect alone is not treated as proof of payment. Order history is stored in the customer's browser. Shipping tracking is not live until connected to a courier service.

## Deploy to Vercel
Push the project to GitHub, import it in Vercel, select Vite, use `npm run build` as build command and `dist` as output directory.
