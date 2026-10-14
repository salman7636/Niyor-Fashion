import { timingSafeEqual } from 'node:crypto';
import { getAppBaseUrl, validateSameOrigin } from '../../lib/api-security.js';
import { listOrders } from '../../lib/order-store.js';

function hasValidToken(authorization, expectedToken) {
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const accessToken = process.env.ADMIN_ACCESS_TOKEN;
  if (!accessToken || Buffer.byteLength(accessToken) < 32) {
    return res.status(503).json({ error: 'The admin dashboard is not configured.' });
  }

  try {
    const appBaseUrl = getAppBaseUrl(req.headers.origin);
    if (!validateSameOrigin(req, appBaseUrl)) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
    if (!hasValidToken(req.headers.authorization, accessToken)) {
      return res.status(401).json({ error: 'Enter a valid admin access token.' });
    }

    const orders = await listOrders();
    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Admin order list request failed.', error.message);
    return res.status(500).json({ error: 'Unable to load orders. Please try again.' });
  }
}
