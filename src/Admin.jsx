import React, { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, PackageCheck, RefreshCw, ShieldCheck } from 'lucide-react';

const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(value);

function readAdminToken() {
  try {
    return window.sessionStorage.getItem('niyor-admin-token') || '';
  } catch (error) {
    console.error('Unable to access admin session storage.', error);
    return '';
  }
}

export default function Admin() {
  const [tokenInput, setTokenInput] = useState('');
  const [accessToken, setAccessToken] = useState(readAdminToken);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(readAdminToken()));
  const [error, setError] = useState('');

  async function loadOrders(token) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          try {
            window.sessionStorage.removeItem('niyor-admin-token');
          } catch (storageError) {
            console.error('Unable to clear admin session storage.', storageError);
          }
          setAccessToken('');
        }
        throw new Error(result.error || 'Unable to load orders.');
      }
      if (!Array.isArray(result.orders)) throw new Error('The order service returned an invalid response.');
      try {
        window.sessionStorage.setItem('niyor-admin-token', token);
      } catch (storageError) {
        console.error('Unable to persist admin session token for this tab.', storageError);
      }
      setAccessToken(token);
      setOrders(result.orders);
    } catch (requestError) {
      console.error('Unable to load admin orders.', requestError);
      setError(requestError.message || 'Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) loadOrders(accessToken);
  }, []);

  function signOut() {
    try {
      window.sessionStorage.removeItem('niyor-admin-token');
    } catch (storageError) {
      console.error('Unable to clear admin session storage.', storageError);
    }
    setAccessToken('');
    setTokenInput('');
    setOrders([]);
    setError('');
  }

  return <main className="admin-page">
    <header className="admin-header">
      <a className="admin-back" href="/"><ArrowLeft size={17} /> Storefront</a>
      <div className="admin-brand"><ShieldCheck size={19} /> NIYOR ORDER DESK</div>
      {accessToken && <button className="admin-signout" onClick={signOut}><LogOut size={16} /> Sign out</button>}
    </header>
    <section className="admin-content">
      <div className="admin-title">
        <div><div className="eyebrow">STAFF DASHBOARD</div><h1>Order <em>management.</em></h1></div>
        {accessToken && <button className="admin-refresh" disabled={loading} onClick={() => loadOrders(accessToken)}><RefreshCw size={15} /> Refresh orders</button>}
      </div>

      {!accessToken ? <form className="admin-login" onSubmit={event => { event.preventDefault(); loadOrders(tokenInput); }}>
        <ShieldCheck size={30} />
        <h2>Staff sign in</h2>
        <p>Enter the private admin access token configured for this server to view customer orders.</p>
        <label htmlFor="admin-token">Admin access token</label>
        <input id="admin-token" type="password" autoComplete="current-password" minLength={32} required value={tokenInput} onChange={event => setTokenInput(event.target.value)} />
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="btn btn-yellow" disabled={loading}>{loading ? 'Checking access…' : 'Open order dashboard'}</button>
      </form> : <>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-summary"><PackageCheck size={18} /><span><b>{orders.length}</b> stored order{orders.length === 1 ? '' : 's'}</span></div>
        {loading && <p className="admin-empty">Loading saved orders…</p>}
        {!loading && !error && !orders.length && <p className="admin-empty">No orders have been placed yet.</p>}
        <div className="admin-orders">{orders.map(order => <article className="admin-order" key={order.reference}>
          <div className="admin-order-heading">
            <div><b>{order.reference}</b><small>{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
            <span>{order.status}</span>
          </div>
          <div className="admin-order-body">
            <section className="admin-customer">
              <h3>Customer & delivery</h3>
              <b>{order.customer?.name}</b>
              <a href={`tel:${encodeURIComponent(order.customer?.phone || '')}`}>{order.customer?.phone}</a>
              {order.customer?.email && <a href={`mailto:${encodeURIComponent(order.customer.email)}`}>{order.customer.email}</a>}
              <p>{order.delivery?.address}{order.delivery?.landmark ? `, ${order.delivery.landmark}` : ''}<br />{order.delivery?.city}, {order.delivery?.state} {order.delivery?.pincode}</p>
            </section>
            <section className="admin-items">
              <h3>Items</h3>
              {order.items?.map((item, index) => <div className="admin-item" key={`${order.reference}-${index}`}>
                <img src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=120&q=70`} alt="" />
                <span>{item.name} × {item.quantity}</span>
                <b>{money(item.price * item.quantity)}</b>
              </div>)}
              <div className="admin-order-total"><span>{order.paymentMethod === 'upi' ? `UPI · ${order.paymentStatus}` : 'Cash on Delivery'}</span><b>{money(order.total)}</b></div>
            </section>
          </div>
        </article>)}</div>
      </>}
    </section>
  </main>;
}
