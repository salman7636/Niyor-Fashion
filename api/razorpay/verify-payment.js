import { getAppBaseUrl, validateSameOrigin } from '../../lib/api-security.js';
import { getRazorpayAuthorization, getRazorpayConfig, verifyRazorpaySignature } from '../../lib/razorpay.js';
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
    const config = getRazorpayConfig();
    const orderId = req.body?.razorpay_order_id;
    const paymentId = req.body?.razorpay_payment_id;
    const signature = req.body?.razorpay_signature;
    if (!verifyRazorpaySignature(orderId, paymentId, signature, config.keySecret)) {
      return res.status(400).json({ error: 'Razorpay payment signature is invalid.' });
    }

    const order = await getOrder(orderId);
    if (!order || order.razorpayOrderId !== orderId || order.paymentMethod !== 'upi') {
      return res.status(404).json({ error: 'The payment order could not be found.' });
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: getRazorpayAuthorization(config) },
      signal: AbortSignal.timeout(10000)
    });
    const payment = await response.json();
    if (!response.ok || payment.order_id !== orderId) {
      console.error('Razorpay payment verification request failed.', { status: response.status });
      return res.status(502).json({ error: 'Razorpay could not verify the payment yet.' });
    }
    if (payment.amount !== order.amountInPaise || payment.currency !== 'INR') {
      console.error('Razorpay payment amount did not match the saved order.', {
        orderId,
        expected: order.amountInPaise,
        received: payment.amount
      });
      return res.status(409).json({ error: 'The payment amount could not be matched to this order.' });
    }

    if (payment.status === 'captured') {
      await saveOrder({
        ...order,
        paymentStatus: 'Paid',
        status: 'Payment successful',
        trackingStep: 0
      }, orderId);
      return res.status(200).json({ state: 'COMPLETED' });
    }
    if (payment.status === 'failed') {
      await saveOrder({
        ...order,
        paymentStatus: 'Failed',
        status: 'Payment not completed',
        trackingStep: -1
      }, orderId);
      return res.status(200).json({ state: 'FAILED' });
    }
    return res.status(200).json({ state: 'PENDING' });
  } catch (error) {
    console.error('Razorpay payment verification failed.', error.message);
    return res.status(500).json({ error: 'Unable to verify Razorpay payment. Please try again.' });
  }
}
