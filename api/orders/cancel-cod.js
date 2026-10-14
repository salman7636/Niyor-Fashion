import { getAppBaseUrl, validateSameOrigin } from '../../lib/api-security.js';
import { getOrder, saveOrder } from '../../lib/order-store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const appBaseUrl = getAppBaseUrl();
    if (!validateSameOrigin(req, appBaseUrl)) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }

    const reference = req.body?.reference;
    if (typeof reference !== 'string' || !/^NF-[0-9a-f-]{36}$/i.test(reference)) {
      return res.status(400).json({ error: 'Invalid order reference.' });
    }

    const order = await getOrder(reference);
    if (!order || order.reference !== reference) {
      return res.status(404).json({ error: 'The order could not be found.' });
    }
    if (order.paymentMethod !== 'cod') {
      return res.status(409).json({ error: 'Only Cash on Delivery orders can be cancelled here. Contact support for payment or refund help.' });
    }
    if (order.status !== 'Order confirmed') {
      return res.status(409).json({ error: 'This order can no longer be cancelled online. Contact support for help.' });
    }

    const cancelledOrder = {
      ...order,
      status: 'Order cancelled',
      paymentStatus: 'Cancelled',
      trackingStep: -1,
      cancelledAt: new Date().toISOString()
    };
    await saveOrder(cancelledOrder);
    return res.status(200).json({ order: cancelledOrder });
  } catch (error) {
    console.error('Cash on Delivery cancellation failed.', error.message);
    return res.status(500).json({ error: 'Unable to cancel this order. Please try again.' });
  }
}
