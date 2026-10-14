import { randomUUID } from 'node:crypto';
import { getAppBaseUrl, validateSameOrigin } from '../../lib/api-security.js';
import { OrderValidationError, validateOrder } from '../../lib/order-validation.js';
import { saveOrder } from '../../lib/order-store.js';

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
    const validatedOrder = validateOrder(req.body?.items, req.body?.customer, req.body?.delivery);
    const reference = `NF-${randomUUID()}`;
    const order = {
      reference,
      createdAt: new Date().toISOString(),
      items: validatedOrder.items,
      total: validatedOrder.amountInPaise / 100,
      amountInPaise: validatedOrder.amountInPaise,
      paymentMethod: 'cod',
      paymentStatus: 'Cash on Delivery',
      status: 'Order confirmed',
      trackingStep: 0,
      customer: validatedOrder.customer,
      delivery: validatedOrder.delivery
    };
    await saveOrder(order);
    return res.status(201).json({ order });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Cash on Delivery order creation failed.', error.message);
    return res.status(500).json({ error: 'Unable to save the order. Please try again.' });
  }
}
