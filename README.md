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
4. Open the URL Netlify prints, usually http://localhost:8888. Netlify Dev runs the storefront, checkout functions, and local Blobs context together; `npm run dev` alone only serves the storefront.

## Customize before client demo
- Replace demo products, images, prices and categories in `src/products.js` with approved brand details.
- Change `WHATSAPP_NUMBER` in `src/App.jsx` to the real number with country code and digits only.
- Replace the Instagram URL and confirm the brand's official links.
- Images are loaded from Unsplash and require internet access.
- Product cards offer Add to Bag and Buy Now. Checkout collects delivery details and offers Cash on Delivery or Razorpay Checkout (including UPI and other Razorpay-supported methods). Both order types are saved server-side in Netlify Blobs; customer Order history is also retained in the browser. A confirmed Cash on Delivery order opens Order history immediately and can be cancelled there until processing starts. Razorpay orders are created on the server and a payment is marked successful only after its signature, captured state, order ID, currency, and amount are verified server-side. Later shipping tracking stages are placeholders until a shipping service is connected.

## Deploy to Netlify and enable Razorpay
1. Import this project into Netlify and set the build command to `npm run build` and publish directory to `dist` (also defined in `netlify.toml`).
2. In **Site configuration → Environment variables**, add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `APP_BASE_URL`. `APP_BASE_URL` must be the exact deployed site origin, using HTTPS (for example, `https://your-site.netlify.app`).
3. Use Razorpay **Test Mode** API keys to test checkout first. Keep both keys as server-side Netlify environment variables; never add the secret to `VITE_*` variables, frontend code, Git, or chat. The public key ID is returned to the browser by the server for Checkout. Redeploy after changing environment variables.
4. Generate a private admin token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Add it as `ADMIN_ACCESS_TOKEN` in Netlify, then redeploy. Open `https://your-site.netlify.app/admin` and enter the token to view COD and UPI orders, customer contact details, addresses, payment status, and items. Never put this token in frontend variables, source code, or chat.
5. Complete a test payment from the deployed site and confirm that a captured payment appears as paid in Order history. Switch to Razorpay Live Mode keys only after your Razorpay account is approved and test checkout is verified.

### Test locally
1. Copy `.env.example` to `.env` and fill in Razorpay Test Mode keys, `APP_BASE_URL=http://localhost:8888`, and an `ADMIN_ACCESS_TOKEN` of at least 32 characters.
2. Run `npm run dev` and open the Netlify Dev URL it prints (usually http://localhost:8888). Do not use the Vite URL at port 5173; Vite alone does not run the COD, payment, or order-storage functions. COD orders can be cancelled from Order history before processing starts. Netlify Dev stores local test orders under the ignored `.netlify/local-blobs` directory; deployed orders use Netlify Blobs.

Razorpay's secret key remains server-side. The server validates each Checkout signature and fetches the payment from Razorpay before marking an order paid. Netlify Blobs stores orders and customer delivery information for fulfillment; the protected staff dashboard reads these server-side records. Customer-facing history is browser-local; live courier tracking is not connected.
