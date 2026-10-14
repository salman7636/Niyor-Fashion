import { products } from '../src/products.js';

const catalog = new Map(products.map(product => [product.id, product]));

export class OrderValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

export function validateOrder(items, customer, delivery) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw new OrderValidationError('The order must contain between 1 and 20 items.');
  }
  if (
    typeof customer?.name !== 'string' || customer.name.trim().length < 2 || customer.name.length > 100 ||
    typeof customer?.phone !== 'string' || !/^[6-9]\d{9}$/.test(customer.phone) ||
    (customer?.email && (typeof customer.email !== 'string' || customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))) ||
    typeof delivery?.address !== 'string' || delivery.address.trim().length < 5 || delivery.address.length > 250 ||
    (delivery?.landmark && (typeof delivery.landmark !== 'string' || delivery.landmark.length > 150)) ||
    typeof delivery?.city !== 'string' || delivery.city.trim().length < 2 || delivery.city.length > 100 ||
    typeof delivery?.state !== 'string' || delivery.state.trim().length < 2 || delivery.state.length > 100 ||
    typeof delivery?.pincode !== 'string' || !/^\d{6}$/.test(delivery.pincode)
  ) {
    throw new OrderValidationError('Enter valid customer and delivery details before placing this order.');
  }

  let amountInPaise = 0;
  const orderItems = [];
  for (const item of items) {
    const product = catalog.get(item?.id);
    if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw new OrderValidationError('The order contains an invalid product or quantity.');
    }
    amountInPaise += product.price * item.quantity * 100;
    orderItems.push({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity
    });
  }
  if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
    throw new OrderValidationError('The order total is invalid.');
  }

  return {
    items: orderItems,
    amountInPaise,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone,
      ...(customer.email ? { email: customer.email.trim() } : {})
    },
    delivery: {
      address: delivery.address.trim(),
      ...(delivery.landmark ? { landmark: delivery.landmark.trim() } : {}),
      city: delivery.city.trim(),
      state: delivery.state.trim(),
      pincode: delivery.pincode
    }
  };
}
