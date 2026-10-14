import { randomUUID } from 'node:crypto';
import { getAppBaseUrl, validateSameOrigin } from '../../lib/api-security.js';
import { getRazorpayAuthorization, getRazorpayConfig } from '../../lib/razorpay.js';
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
    let config;
    try {
      config = getRazorpayConfig();
    } catch (error) {
      console.error('Razorpay server configuration is incomplete.', error.message);
      return res.status(503).json({
        error: 'Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Netlify environment variables, then redeploy.'
      });
    }
    const validatedOrder = validateOrder(req.body?.items, req.body?.customer, req.body?.delivery);
    const reference = `NF-${randomUUID()}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: getRazorpayAuthorization(config),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: validatedOrder.amountInPaise,
        currency: 'INR',
        receipt: reference
      }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok || typeof result.id !== 'string' || result.amount !== validatedOrder.amountInPaise || result.currency !== 'INR') {
      console.error('Razorpay order creation failed.', {
        status: response.status,
        code: result?.error?.code,
        description: result?.error?.description
      });
      const errorMessage = response.status === 401 || response.status === 403
        ? 'Razorpay rejected the API credentials. Confirm that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a matching pair from the same Test or Live mode.'
        : 'Razorpay could not create this payment order. Check your Razorpay account setup and try again.';
      return res.status(502).json({ error: errorMessage });
    }

    const order = {
      reference,
      razorpayOrderId: result.id,
      createdAt: new Date().toISOString(),
      items: validatedOrder.items,
      total: validatedOrder.amountInPaise / 100,
      amountInPaise: validatedOrder.amountInPaise,
      paymentMethod: 'upi',
      paymentStatus: 'Pending',
      status: 'Awaiting payment',
      trackingStep: -1,
      customer: validatedOrder.customer,
      delivery: validatedOrder.delivery
    };
    await saveOrder(order, result.id);
    return res.status(200).json({
      reference,
      gatewayOrderId: result.id,
      amount: result.amount,
      currency: result.currency,
      keyId: config.keyId
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Razorpay payment initiation failed.', error.message);
    return res.status(500).json({ error: 'Unable to start Razorpay checkout. Check the server configuration and try again.' });
  }
}
