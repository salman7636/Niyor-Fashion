import { createHmac, timingSafeEqual } from 'node:crypto';

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay server environment variables are not configured.');
  }
  return { keyId, keySecret };
}

export function getRazorpayAuthorization(config) {
  return `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`;
}

export function verifyRazorpaySignature(orderId, paymentId, signature, keySecret) {
  if (
    typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
    typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
    typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
