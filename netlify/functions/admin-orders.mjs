import handler from '../../api/admin/orders.js';
import { adaptApiHandler } from '../../lib/netlify-api-adapter.js';

export default adaptApiHandler(handler);
