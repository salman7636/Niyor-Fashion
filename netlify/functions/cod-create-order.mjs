import handler from '../../api/orders/create-cod.js';
import { adaptApiHandler } from '../../lib/netlify-api-adapter.js';

export default adaptApiHandler(handler);
