import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, Heart, ReceiptText,
  Headphones, Menu, Minus, Plus, Search, ShieldCheck, ShoppingBag,
  Trash2, Truck, UserRound, X, Zap, Crown, House, SlidersHorizontal
} from 'lucide-react';
import { products } from './products.js';

const WHATSAPP_NUMBER = '917636947629';
const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let razorpayScriptPromise;

const categories = [
  { label: 'Men', image: 'photo-1516257984-b1b4d707412e', note: 'Built for every day' },
  { label: 'Women', image: 'photo-1483985988355-763728e1935b', note: 'Own your look' },
  { label: 'Accessories', image: 'photo-1523170335258-f5ed11844a49', note: 'Finish the fit' },
];

const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(value);

function Photo({ id, alt, className = '', style = {} }) {
  return <img className={className} style={style} src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`} alt={alt} loading="lazy" />;
}

function loadOrderHistory() {
  try {
    const saved = window.localStorage.getItem('niyor-order-history');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Unable to load saved order history.', error);
    return [];
  }
}

async function loadRazorpayCheckout() {
  if (typeof window.Razorpay === 'function') return;
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_URL}"]`) || document.createElement('script');
    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      if (typeof window.Razorpay === 'function') resolve();
      else {
        script.remove();
        reject(new Error('Razorpay loaded without its checkout interface. Reload the page and try again.'));
      }
    };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error('Razorpay checkout could not load. Check your internet connection or content blocker and try again.'));
    };

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    timeout = window.setTimeout(() => {
      cleanup();
      script.remove();
      reject(new Error('Razorpay checkout is taking too long to load. Check your internet connection and try again.'));
    }, 15000);

    if (!script.src) {
      script.src = RAZORPAY_CHECKOUT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  }).catch(error => {
    razorpayScriptPromise = undefined;
    throw error;
  });

  return razorpayScriptPromise;
}

async function readApiResponse(response, unavailableMessage) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(unavailableMessage);
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The checkout request failed. Please try again.');
  return result;
}

export default function App() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [checkoutItems, setCheckoutItems] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('bag');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderReference, setOrderReference] = useState('');
  const [orderHistory, setOrderHistory] = useState(loadOrderHistory);
  const [startingPayment, setStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState('');
  const [cancellationError, setCancellationError] = useState('');
  const cancellationInFlight = useRef(new Set());
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '', phone: '', email: '', address: '', landmark: '', city: '', state: '', pincode: ''
  });
  const [wishlist, setWishlist] = useState([]);
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => products.filter(p => {
    const cat = category === 'All' || p.category === category ||
      (category === 'Men' && ['T-Shirts', 'Hoodies', 'Jackets'].includes(p.category)) ||
      (category === 'Women' && ['Women', 'T-Shirts', 'Hoodies'].includes(p.category));
    return cat && p.name.toLowerCase().includes(search.toLowerCase());
  }), [category, search]);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = cart.reduce((sum, item) => sum + (item.oldPrice - item.price) * item.quantity, 0);

  useEffect(() => {
    try {
      window.localStorage.setItem('niyor-order-history', JSON.stringify(orderHistory));
    } catch (error) {
      console.error('Unable to save order history in this browser.', error);
    }
  }, [orderHistory]);

  function flash(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }
  function addToCart(product) {
    setCart(current => {
      const found = current.find(item => item.id === product.id);
      return found
        ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }];
    });
    setCheckoutItems(null);
    setCheckoutStep('bag');
    setCartOpen(true);
    flash(`${product.name} added to bag`);
  }
  function buyNow(product) {
    setCheckoutItems([{ ...product, quantity: 1 }]);
    setCheckoutStep('address');
    setPaymentMethod('cod');
    setCartOpen(true);
  }
  function quantity(id, amount) {
    setCart(current => current.map(item => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0));
  }
  function openWhatsApp(details, method, items = cart, reference = orderReference) {
    const orderSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = items.length
      ? `${items.map(i => `${i.name} × ${i.quantity} — ${money(i.price * i.quantity)}`).join('\n')}\nSubtotal: ${money(orderSubtotal)}`
      : 'Hi Niyor Fashion! I would like to know more about your collection.';
    const delivery = details
      ? `\n\nOrder reference: ${reference || 'New order'}\nDelivery details:\nName: ${details.name}\nPhone: ${details.phone}${details.email ? `\nEmail: ${details.email}` : ''}\nAddress: ${details.address}${details.landmark ? `, ${details.landmark}` : ''}\nCity: ${details.city}\nState: ${details.state}\nPIN code: ${details.pincode}\nPayment: ${method === 'upi' ? 'UPI via Razorpay' : 'Cash on Delivery'}`
      : '\nPlease confirm availability, size and delivery.';
    const text = items.length
      ? `Hi Niyor Fashion! I'd like to order:\n${order}${delivery}`
      : order;
    const number = WHATSAPP_NUMBER.replace(/\D/g, '');
    const url = number && !number.includes('XXXXXXXXXX')
      ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    return window.open(url, '_blank', 'noopener,noreferrer') !== null;
  }
  const orderItems = checkoutItems ?? cart;
  const orderSubtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderDiscount = orderItems.reduce((sum, item) => sum + (item.oldPrice - item.price) * item.quantity, 0);
  function createOrderRecord(method, reference = `NF-${Date.now().toString(36).toUpperCase()}`) {
    const record = {
      reference,
      createdAt: new Date().toISOString(),
      items: orderItems.map(item => ({ name: item.name, image: item.image, quantity: item.quantity, price: item.price })),
      total: orderSubtotal,
      paymentMethod: method,
      status: method === 'cod' ? 'Order confirmed' : 'Awaiting payment',
      paymentStatus: method === 'cod' ? 'Cash on Delivery' : 'Pending',
      trackingStep: method === 'cod' ? 0 : -1,
      customer: {
        name: deliveryDetails.name,
        phone: deliveryDetails.phone,
        email: deliveryDetails.email
      },
      delivery: {
        address: deliveryDetails.address,
        landmark: deliveryDetails.landmark,
        city: deliveryDetails.city,
        state: deliveryDetails.state,
        pincode: deliveryDetails.pincode
      }
    };
    setOrderHistory(current => [record, ...current]);
    setOrderReference(reference);
    return record;
  }
  function deliveryPayload() {
    return {
      customer: {
        name: deliveryDetails.name,
        phone: deliveryDetails.phone,
        email: deliveryDetails.email
      },
      delivery: {
        address: deliveryDetails.address,
        landmark: deliveryDetails.landmark,
        city: deliveryDetails.city,
        state: deliveryDetails.state,
        pincode: deliveryDetails.pincode
      }
    };
  }
  async function placeCodOrder() {
    setStartingPayment(true);
    setPaymentError('');
    try {
      const response = await fetch('/api/orders/create-cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems.map(item => ({ id: item.id, quantity: item.quantity })),
          ...deliveryPayload()
        })
      });
      const result = await readApiResponse(
        response,
        'Order service is not running. Start the website with `npm run dev` (Netlify Dev) and open the Netlify URL, usually http://localhost:8888.'
      );
      if (typeof result.order?.reference !== 'string') throw new Error('The order service returned an invalid order reference.');

      const order = createOrderRecord('cod', result.order.reference);
      const savedOrder = { ...order, createdAt: result.order.createdAt };
      setOrderHistory(current => current.map(item => item.reference === order.reference ? savedOrder : item));
      setCheckoutStep('history');
      flash('Cash on Delivery order confirmed. It is now in your Order history.');
    } catch (error) {
      console.error('Cash on Delivery order request failed.', error);
      setPaymentError(error.message || 'Unable to place this order. Please try again.');
    } finally {
      setStartingPayment(false);
    }
  }
  async function cancelCodOrder(reference) {
    if (cancellationInFlight.current.has(reference)) return;
    if (!window.confirm('Cancel this Cash on Delivery order?')) return;
    cancellationInFlight.current.add(reference);
    setCancellingOrder(reference);
    setCancellationError('');
    try {
      const response = await fetch('/api/orders/cancel-cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });
      const result = await readApiResponse(
        response,
        'Order cancellation service is not available. Please try again from the Netlify storefront.'
      );
      if (result.order?.reference !== reference || result.order.status !== 'Order cancelled') {
        throw new Error('The order service returned an invalid cancellation response.');
      }
      setOrderHistory(current => current.map(order => order.reference === reference
        ? { ...order, ...result.order }
        : order));
      flash('Order cancelled successfully.');
    } catch (error) {
      console.error('Unable to cancel Cash on Delivery order.', error);
      setCancellationError(error.message || 'Unable to cancel this order. Please try again.');
    } finally {
      cancellationInFlight.current.delete(reference);
      setCancellingOrder('');
    }
  }
  async function verifyRazorpayPayment(paymentResponse, reference, attempt = 0) {
    try {
      const response = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentResponse)
      });
      const result = await readApiResponse(
        response,
        'The payment verification service is unavailable. Please check Order history and contact support before paying again.'
      );
      if (result.state === 'PENDING' && attempt < 20) {
        window.setTimeout(() => verifyRazorpayPayment(paymentResponse, reference, attempt + 1), 2500);
        return;
      }
      setOrderHistory(current => current.map(order => order.reference === reference
        ? result.state === 'COMPLETED'
          ? { ...order, status: 'Payment successful', paymentStatus: 'Paid', trackingStep: 0 }
          : result.state === 'FAILED'
            ? { ...order, status: 'Payment not completed', paymentStatus: 'Failed', trackingStep: -1 }
            : { ...order, status: 'Payment pending', paymentStatus: 'Pending' }
        : order));
      setCheckoutStep('history');
      setCartOpen(true);
      if (result.state === 'COMPLETED') flash('Payment successful. Order history updated.');
      else if (result.state === 'FAILED') flash('Payment was not completed. Please try again.');
      else flash('Payment is still processing. Check Order history shortly.');
    } catch (error) {
      console.error('Unable to verify Razorpay payment.', error);
      setPaymentError(error.message || 'Unable to verify Razorpay payment. Please check Order history.');
      setCheckoutStep('history');
      setCartOpen(true);
    }
  }
  async function startRazorpayPayment() {
    setStartingPayment(true);
    setPaymentError('');
    try {
      await loadRazorpayCheckout();
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems.map(item => ({ id: item.id, quantity: item.quantity })),
          ...deliveryPayload()
        })
      });
      const result = await readApiResponse(
        response,
        'Payment service is not running. Start the website with `npm run dev` (Netlify Dev) and open the Netlify URL, usually http://localhost:8888.'
      );
      if (
        typeof result.gatewayOrderId !== 'string' ||
        typeof result.reference !== 'string' ||
        typeof result.keyId !== 'string' ||
        !Number.isSafeInteger(result.amount)
      ) {
        throw new Error('Razorpay returned an invalid checkout order.');
      }

      const record = createOrderRecord('upi', result.reference);
      try {
        window.localStorage.setItem('niyor-order-history', JSON.stringify([
          record,
          ...orderHistory.filter(order => order.reference !== record.reference)
        ]));
      } catch (error) {
        console.error('Unable to save pending Razorpay order before checkout.', error);
        throw new Error('Could not save the order in this browser. Please enable local storage and try again.');
      }
      const checkout = new window.Razorpay({
        key: result.keyId,
        amount: result.amount,
        currency: result.currency,
        name: 'NIYOR Fashion',
        description: `Order ${result.reference}`,
        order_id: result.gatewayOrderId,
        prefill: {
          name: deliveryDetails.name,
          email: deliveryDetails.email,
          contact: deliveryDetails.phone
        },
        notes: { order_reference: result.reference },
        theme: { color: '#ffd400' },
        handler: paymentResponse => {
          void verifyRazorpayPayment(paymentResponse, result.reference);
        },
        modal: {
          ondismiss: () => {
            setStartingPayment(false);
            flash('Payment was not completed. You can try again from this order.');
          }
        }
      });
      checkout.open();
      setStartingPayment(false);
    } catch (error) {
      console.error('Unable to start Razorpay payment.', error);
      setPaymentError(error.message || 'Unable to start Razorpay checkout.');
      setStartingPayment(false);
    }
  }
  function goShop(cat = 'All') {
    setCategory(cat);
    setMobileMenu(false);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  }

  return <div className="app">
    <div className="topline"><Zap size={13} fill="currentColor" /> BOLD LOOKS. EVERYDAY PRICES. <span>FREE SHIPPING ON ORDERS ABOVE ₹999</span></div>
    <header className="header">
      <button className="icon-btn menu-btn" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X /> : <Menu />}</button>
      <a className="brand" href="#home"><Crown size={19} strokeWidth={2.5} /><span>NIYOR</span><small>F A S H I O N</small></a>
      <nav className={`main-nav ${mobileMenu ? 'show' : ''}`}>
        <a href="#home" onClick={() => setMobileMenu(false)}>Home</a>
        <a href="#shop" onClick={() => { setCategory('All'); setMobileMenu(false); }}>Shop all</a>
        <a href="#categories" onClick={() => setMobileMenu(false)}>Categories</a>
        <a href="#about" onClick={() => setMobileMenu(false)}>Our story</a>
      </nav>
      <div className="header-tools">
        <button className="icon-btn search-btn" aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}><Search /></button>
        <button className="icon-btn order-history-trigger" aria-label="Order history" onClick={() => { setCheckoutStep('history'); setCartOpen(true); }}><ReceiptText /><span>Orders</span></button>
        <button className="icon-btn cart-trigger" aria-label={`Shopping bag ${count} items`} onClick={() => setCartOpen(true)}><ShoppingBag /><span>Bag</span><b>{count}</b></button>
      </div>
    </header>

    {searchOpen && <div className="search-bar"><Search size={18} /><input autoFocus placeholder="Search tees, hoodies, accessories..." value={search} onChange={e => { setSearch(e.target.value); goShop(category); }} /><button className="icon-btn" onClick={() => { setSearchOpen(false); setSearch(''); }} aria-label="Close search"><X /></button></div>}

    <main>
      <section className="hero" id="home">
        <div className="hero-bg"><Photo id="photo-1523398002811-999ca8dec234" alt="Streetwear fashion editorial" /></div>
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow"><span /> THE NEW STREET EDITION</div>
          <h1>STYLE<br /><em>BEYOND</em><br />TRENDS<span className="yellow-dot">.</span></h1>
          <p>Premium streetwear for bold individuals. Make your everyday look impossible to ignore.</p>
          <button className="btn btn-yellow" onClick={() => goShop('All')}>Shop collection <ArrowRight size={18} /></button>
          <div className="hero-foot"><span>01 / 04</span><div /><span>NIYOR ORIGINALS</span></div>
        </div>
        <div className="hero-badge"><span>OWN</span><strong>YOUR</strong><span>STYLE ✳</span></div>
      </section>

      <section className="benefits">
        <div><Truck /><span><b>Free shipping</b><small>On orders above ₹999</small></span></div>
        <div><ShieldCheck /><span><b>Easy returns</b><small>7-day return window*</small></span></div>
        <div><Headphones /><span><b>We're here</b><small>Quick customer support</small></span></div>
      </section>

      <section className="categories section" id="categories">
        <div className="section-top"><div><div className="eyebrow">FIND YOUR FIT</div><h2>Shop by <em>category.</em></h2></div><button className="text-action" onClick={() => goShop('All')}>View all <ArrowRight size={16} /></button></div>
        <div className="category-grid">{categories.map(c => <button className="category-card" key={c.label} onClick={() => goShop(c.label)}>
          <Photo id={c.image} alt={`${c.label} fashion`} /><span className="category-overlay" /><span className="category-copy"><small>{c.note}</small><b>{c.label}</b><span>SHOP NOW <ArrowUpRight size={15} /></span></span>
        </button>)}</div>
      </section>

      <section className="shop section" id="shop">
        <div className="section-top"><div><div className="eyebrow">FRESH DROPS, ALWAYS</div><h2>Trending <em>right now.</em></h2></div><div className="shop-count">{filtered.length} PRODUCTS</div></div>
        <div className="shop-tools">
          <div className="filters">{['All', 'T-Shirts', 'Hoodies', 'Jackets', 'Women', 'Accessories'].map(cat => <button key={cat} className={category === cat ? 'filter active' : 'filter'} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
          <span className="filter-icon"><SlidersHorizontal size={14} /> FILTER</span>
        </div>
        <div className="product-grid">{filtered.map(p => <article className="product-card" key={p.id}>
          <div className="product-photo"><Photo id={p.image} alt={p.name} style={{ objectPosition: p.object }} />
            {p.badge && <span className="product-badge">{p.badge}</span>}
            <button className={`wishlist ${wishlist.includes(p.id) ? 'liked' : ''}`} aria-label="Toggle wishlist" onClick={() => setWishlist(w => w.includes(p.id) ? w.filter(id => id !== p.id) : [...w, p.id])}><Heart size={18} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} /></button>
          </div>
          <div className="product-meta"><div><h3>{p.name}</h3><span>{p.color}</span></div><strong>{money(p.price)}</strong></div>
          <div className="price-line"><del>{money(p.oldPrice)}</del><span>{Math.round((1 - p.price / p.oldPrice) * 100)}% OFF</span></div>
          <div className="product-actions">
            <button className="quick-add" onClick={() => addToCart(p)}><ShoppingBag size={15} /> ADD TO BAG</button>
            <button className="quick-buy" onClick={() => buyNow(p)}><Zap size={14} fill="currentColor" /> BUY NOW</button>
          </div>
        </article>)}</div>
        {filtered.length === 0 && <div className="no-results">No products found. Try a different search.</div>}
        <button className="btn btn-outline view-products" onClick={() => { setCategory('All'); setSearch(''); }}>View all products <ArrowRight size={17} /></button>
      </section>

      <section className="campaign">
        <Photo id="photo-1515886657613-9f3515b0c78f" alt="Urban streetwear campaign" />
        <div className="campaign-overlay" />
        <div className="campaign-copy"><div className="eyebrow">DROP 02 — THE URBAN EDIT</div><h2>MAKE<br />SOME <em>NOISE.</em></h2><p>Everyday essentials. Unapologetic energy.</p><button className="btn btn-yellow" onClick={() => goShop('All')}>Explore the drop <ArrowRight size={17} /></button></div>
        <div className="campaign-number">N / 002</div>
      </section>

      <section className="about section" id="about">
        <div className="about-mark"><Crown size={26} /><span>N</span></div>
        <div className="about-copy"><div className="eyebrow">THIS IS NIYOR</div><h2>Wear your<br /><em>own energy.</em></h2><p>We make room for self-expression. From easy everyday tees to statement layers, Niyor is built around the idea that style should feel personal, confident, and completely yours.</p><button className="text-action" onClick={() => goShop('All')}>Find your next favourite <ArrowRight size={16} /></button></div>
      </section>

      <section className="newsletter"><div><div className="eyebrow">DON'T MISS THE DROP</div><h2>Stay in the <em>loop.</em></h2><p>New drops, fresh fits, and exclusive offers.</p></div><Newsletter /></section>
    </main>

    <footer className="footer">
      <div className="footer-top"><div className="footer-brand"><a className="brand" href="#home"><Crown size={19} /><span>NIYOR</span><small>F A S H I O N</small></a><p>Style beyond trends.<br />Made for your everyday.</p><button className="social-link" onClick={() => window.open('https://instagram.com/', '_blank', 'noopener,noreferrer')}>Instagram <ArrowUpRight size={15} /></button></div>
        <div className="footer-col"><b>EXPLORE</b><a href="#shop">Shop all</a><a href="#categories">Categories</a><a href="#about">Our story</a><a href="#shop">New arrivals</a></div>
        <div className="footer-col"><b>HELP & INFO</b><a href="#footer">Shipping & returns</a><a href="#footer">Size guide</a><a href="#footer">FAQs</a><button onClick={openWhatsApp}>Contact us</button></div>
        <div className="footer-note"><BadgeCheck size={23} /><p>Good fits.<br /><strong>Good energy.</strong></p><span>NIYOR FASHION © {new Date().getFullYear()}</span></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} NIYOR FASHION</span><span>BUILT FOR THE BOLD.</span><a href="#home">BACK TO TOP ↑</a></div>
    </footer>

    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <a href="#home"><House size={19} /><span>Home</span></a>
      <button onClick={() => goShop('All')}><ShoppingBag size={19} /><span>Shop</span></button>
      <button onClick={() => { setCategory('All'); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); flash(`${wishlist.length} saved item${wishlist.length === 1 ? '' : 's'} in wishlist`); }}><Heart size={19} /><span>Wishlist</span></button>
      <button onClick={() => setCartOpen(true)}><UserRound size={19} /><span>Bag ({count})</span></button>
    </nav>

    {toast && <div className="toast"><Check size={17} />{toast}</div>}

    {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
      <aside className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header"><div><span className="eyebrow">{checkoutStep === 'bag' ? 'YOUR SELECTION' : checkoutStep === 'address' ? 'DELIVERY INFORMATION' : checkoutStep === 'confirmation' ? 'ORDER REQUEST' : checkoutStep === 'history' ? 'YOUR PURCHASES' : 'SECURE YOUR ORDER'}</span><h2>{checkoutStep === 'bag' ? <>Your bag <span>({count})</span></> : checkoutStep === 'address' ? 'Delivery details' : checkoutStep === 'confirmation' ? 'Order confirmation' : checkoutStep === 'history' ? 'Order history' : 'Payment option'}</h2></div><button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close cart"><X /></button></div>
        {checkoutStep === 'bag' && (!cart.length ? <div className="cart-empty"><ShoppingBag size={35} /><h3>Your next favourite belongs here.</h3><p>Your bag is empty for now.</p><button className="btn btn-yellow" onClick={() => { setCartOpen(false); goShop('All'); }}>Start shopping <ArrowRight size={16} /></button></div> :
          <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><Photo id={item.image} alt={item.name} /><div className="cart-item-info"><b>{item.name}</b><span>{item.color} / {item.size}</span><strong>{money(item.price)}</strong><div className="qty"><button onClick={() => quantity(item.id, -1)} aria-label="Decrease"><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => quantity(item.id, 1)} aria-label="Increase"><Plus size={13} /></button></div></div><button className="remove-item" onClick={() => setCart(c => c.filter(i => i.id !== item.id))} aria-label="Remove item"><Trash2 size={16} /></button></div>)}</div>
          <div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Estimated discount</span><b className="discount">−{money(discount)}</b></div><div className="cart-total"><span>Total</span><strong>{money(subtotal)}</strong></div><p>Delivery and availability will be confirmed by our team.</p><button className="btn btn-yellow checkout" onClick={() => openWhatsApp()}>Order on WhatsApp <ArrowUpRight size={17} /></button><button className="btn btn-outline checkout checkout-buy" onClick={() => { setCheckoutItems(null); setCheckoutStep('address'); }}>Buy now <Zap size={15} fill="currentColor" /></button><button className="continue" onClick={() => setCartOpen(false)}>Continue shopping</button></div></>)}
        {checkoutStep === 'address' && <form className="checkout-form" onSubmit={e => { e.preventDefault(); setCheckoutStep('payment'); }}>
          <p className="checkout-intro">Enter your delivery address to continue with this order.</p>
          <div className="checkout-order">{orderItems.map(item => <div key={item.id}><span>{item.name} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>)}<div className="checkout-order-total"><span>Total</span><b>{money(orderSubtotal)}</b></div></div>
          <label>Full name<input required autoComplete="name" value={deliveryDetails.name} onChange={e => setDeliveryDetails({ ...deliveryDetails, name: e.target.value })} /></label>
          <label>Mobile number<input required type="tel" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" value={deliveryDetails.phone} onChange={e => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })} /></label>
          <label>Email address (optional)<input type="email" autoComplete="email" value={deliveryDetails.email} onChange={e => setDeliveryDetails({ ...deliveryDetails, email: e.target.value })} /></label>
          <label>Address<input required autoComplete="street-address" value={deliveryDetails.address} onChange={e => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })} /></label>
          <label>Landmark (optional)<input value={deliveryDetails.landmark} onChange={e => setDeliveryDetails({ ...deliveryDetails, landmark: e.target.value })} /></label>
          <div className="checkout-fields-row"><label>City<input required autoComplete="address-level2" value={deliveryDetails.city} onChange={e => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })} /></label><label>State<input required autoComplete="address-level1" value={deliveryDetails.state} onChange={e => setDeliveryDetails({ ...deliveryDetails, state: e.target.value })} /></label></div>
          <label>PIN code<input required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" title="Enter a valid 6-digit PIN code" value={deliveryDetails.pincode} onChange={e => setDeliveryDetails({ ...deliveryDetails, pincode: e.target.value })} /></label>
          <button className="btn btn-yellow checkout" type="submit">Continue to payment <ArrowRight size={16} /></button>
          <button className="continue" type="button" onClick={() => setCheckoutStep('bag')}>Back to bag</button>
        </form>}
        {checkoutStep === 'payment' && <div className="payment-step">
          <p className="checkout-intro">Review your order and choose a payment method.</p>
          <div className="checkout-order">{orderItems.map(item => <div key={item.id}><span>{item.name} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>)}<div className="checkout-order-discount"><span>You save</span><b>−{money(orderDiscount)}</b></div><div className="checkout-order-total"><span>Order total</span><b>{money(orderSubtotal)}</b></div></div>
          {paymentError && <p className="payment-error" role="alert">{paymentError}</p>}
          <button className="payment-choice cod-place-order" disabled={startingPayment} onClick={placeCodOrder}><span><b>Cash on Delivery</b><small>{startingPayment ? 'Saving your order…' : 'Tap to confirm your order now. No WhatsApp step required.'}</small></span><ArrowRight size={17} /></button>
          <label className={`payment-choice ${paymentMethod === 'upi' ? 'selected' : ''}`}><input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => { setPaymentMethod('upi'); setPaymentError(''); }} /><span><b>UPI</b><small>Pay securely through Razorpay checkout.</small></span></label>
          {paymentMethod === 'upi' && <div className="upi-details">
            <span className="upi-label">RAZORPAY SECURE CHECKOUT</span>
            <strong>UPI, cards and supported payment methods</strong>
            <small>Your order moves to Order history as paid only after Razorpay verifies the captured payment.</small>
          </div>}
          {paymentMethod === 'upi' && <button className="btn btn-yellow checkout" disabled={startingPayment} onClick={startRazorpayPayment}>{startingPayment ? 'Connecting to Razorpay…' : 'Pay securely with Razorpay'} <ArrowUpRight size={16} /></button>}
          <button className="continue" onClick={() => setCheckoutStep('address')}>Back to delivery details</button>
        </div>}
        {checkoutStep === 'confirmation' && <div className="order-confirmation">
          <div className="confirmation-mark"><Check size={28} /></div>
          <h3>Cash on Delivery order confirmed</h3>
          <p className="checkout-intro">Reference: <strong>{orderReference}</strong></p>
          <div className="checkout-order">
            {orderItems.map(item => <div key={item.id}><span>{item.name} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>)}
            <div className="checkout-order-total"><span>Cash on Delivery total</span><b>{money(orderSubtotal)}</b></div>
          </div>
          <div className="confirmation-address"><b>Deliver to</b><span>{deliveryDetails.name} · {deliveryDetails.phone}</span><span>{deliveryDetails.address}{deliveryDetails.landmark ? `, ${deliveryDetails.landmark}` : ''}</span><span>{deliveryDetails.city}, {deliveryDetails.state} {deliveryDetails.pincode}</span></div>
          <p className="confirmation-notice">Your order is saved in Order history on this browser. Tracking will update here when connected to store/shipping updates.</p>
          <button className="btn btn-yellow checkout" onClick={() => setCheckoutStep('history')}>View order history <ArrowRight size={16} /></button>
          <button className="continue" onClick={() => setCartOpen(false)}>Continue shopping</button>
        </div>}
        {checkoutStep === 'history' && <div className="order-history">
          {cancellationError && <p className="payment-error" role="alert">{cancellationError}</p>}
          {!orderHistory.length
            ? <div className="cart-empty"><ReceiptText size={35} /><h3>No orders yet.</h3><p>Your confirmed checkout orders will appear here on this browser.</p><button className="btn btn-yellow" onClick={() => { setCartOpen(false); goShop('All'); }}>Start shopping <ArrowRight size={16} /></button></div>
            : <>{orderHistory.map(order => <article className="history-order" key={order.reference}>
              <div className="history-order-top"><div><span className="history-reference">{order.reference}</span><small>{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><span className="history-status">{order.status}</span></div>
              <div className="history-order-items">{order.items.map((item, index) => {
                const image = item.image || products.find(product => product.name === item.name)?.image;
                return <div className="history-item" key={`${order.reference}-${index}`}>
                  {image && <Photo id={image} alt={item.name} />}
                  <span>{item.name} × {item.quantity}</span><b>{money(item.price * item.quantity)}</b>
                </div>;
              })}</div>
              <div className="history-order-bottom"><span>{order.paymentMethod === 'upi' ? 'UPI' : 'Cash on Delivery'}</span><strong>{money(order.total)}</strong></div>
              <div className="order-tracking">
                <b>Order tracking</b>
                <div className="tracking-timeline">
                  {['Order confirmed', 'Preparing', 'Shipped', 'Out for delivery', 'Delivered'].map((step, index) => {
                    const currentStep = order.trackingStep ?? (order.paymentMethod === 'cod' ? 0 : -1);
                    const active = index <= currentStep;
                    return <div className={`tracking-step ${active ? 'active' : ''}`} key={step}>
                      <span className="tracking-dot">{active && <Check size={10} />}</span>
                      <span>{step}</span>
                    </div>;
                  })}
                </div>
                <small>{order.status === 'Order cancelled' ? `Cancelled ${order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}` : order.paymentMethod === 'cod' ? 'Order confirmed. Further tracking updates are not available in this demo.' : order.status}</small>
              </div>
              {order.paymentMethod === 'cod' && order.status === 'Order confirmed' && <button
                className="cancel-order"
                disabled={cancellingOrder === order.reference}
                onClick={() => cancelCodOrder(order.reference)}
              >
                {cancellingOrder === order.reference ? 'Cancelling…' : 'Cancel order'}
              </button>}
            </article>)}
            <p className="history-note">Order history is saved only in this browser. Shipping progress is a placeholder until live store or courier tracking is connected.</p>
            <button className="continue" onClick={() => setCartOpen(false)}>Continue shopping</button></>}
        </div>}
      </aside>
    </div>}
  </div>;
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return <form className="newsletter-form" onSubmit={e => { e.preventDefault(); if (email.includes('@')) setDone(true); }}>
    <label className="sr-only" htmlFor="newsletter-email">Email address</label><div className="email-input"><input id="newsletter-email" type="email" required placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} /><button aria-label="Subscribe"><ArrowRight size={19} /></button></div>
    <small>{done ? 'Thanks! This demo does not store email addresses yet.' : 'By subscribing, you agree to receive Niyor updates.'}</small>
  </form>;
}