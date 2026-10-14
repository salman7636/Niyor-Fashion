import handler from '../../api/razorpay/verify-payment.js';
import { adaptApiHandler } from '../../lib/netlify-api-adapter.js';

export default adaptApiHandler(handler);
