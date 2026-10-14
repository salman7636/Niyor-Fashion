import handler from '../../api/razorpay/create-order.js';
import { adaptApiHandler } from '../../lib/netlify-api-adapter.js';

export default adaptApiHandler(handler);
