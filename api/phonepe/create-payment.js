import { randomUUID } from 'node:crypto';
import { getPhonePeAccessToken, getPhonePeConfig, validateSameOrigin } from '../../lib/phonepe.js';
import { products } from '../../src/products.js';

const catalog = new Map(products.map(product => [product.id, product]));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const config = getPhonePeConfig();
    if (!validateSameOrigin(req, config.appBaseUrl)) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res.status(400).json({ error: 'The order must contain between 1 and 20 items.' });
    }

    let amountInPaise = 0;
    for (const item of items) {
      const product = catalog.get(item?.id);
      if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
        return res.status(400).json({ error: 'The order contains an invalid product or quantity.' });
      }
      amountInPaise += product.price * item.quantity * 100;
    }
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({ error: 'The order total is invalid.' });
    }

    const merchantOrderId = `NF-${randomUUID()}`;
    const redirect = new URL(config.appBaseUrl);
    redirect.searchParams.set('payment', 'phonepe');
    redirect.searchParams.set('orderId', merchantOrderId);

    const accessToken = await getPhonePeAccessToken(config);
    const paymentResponse = await fetch(`${config.paymentBaseUrl}/pay`, {
      method: 'POST',
      headers: {
        Authorization: `O-Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        merchantOrderId,
        amount: amountInPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: 'PG_CHECKOUT',
          message: 'Payment for Niyor Fashion order',
          merchantUrls: { redirectUrl: redirect.toString() }
        }
      }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await paymentResponse.json();
    if (!paymentResponse.ok || typeof result.redirectUrl !== 'string') {
      console.error('PhonePe checkout creation failed.', { status: paymentResponse.status });
      return res.status(502).json({ error: 'PhonePe could not start the payment. Please try again.' });
    }

    const redirectUrl = new URL(result.redirectUrl);
    if (redirectUrl.protocol !== 'https:' || !redirectUrl.hostname.endsWith('.phonepe.com')) {
      throw new Error('PhonePe returned an unexpected checkout URL.');
    }
    return res.status(200).json({ merchantOrderId, redirectUrl: redirectUrl.toString() });
  } catch (error) {
    console.error('PhonePe payment initiation failed.', error.message);
    return res.status(500).json({ error: 'Unable to start PhonePe payment. Check the server configuration and try again.' });
  }
}
