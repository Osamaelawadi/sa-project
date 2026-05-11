import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, User, Package, RefreshCw, PlusCircle, 
  LayoutDashboard, Users, ShoppingBag, Activity, 
  TrendingUp, CreditCard, Box, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ kafka: false });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling for "live" feel
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, userRes, orderRes, healthRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/users'),
        axios.get('/api/orders'),
        axios.get('/api/orders/health').catch(() => ({ data: { kafka: false } }))
      ]);
      setProducts(prodRes.data);
      setUsers(userRes.data);
      setOrders(orderRes.data);
      setSystemHealth(healthRes.data);
    } catch (err) {
      console.error("Sync Error:", err);
    }
    setLoading(false);
  };

  const addNotification = (text, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [{ id, text, type }, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const registerUser = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    try {
      const res = await axios.post('/api/users', { username, email, fullName: username });
      setUsers([...users, res.data]);
      setCurrentUser(res.data);
      addNotification(`User ${username} registered & event emitted!`, 'success');
      e.target.reset();
    } catch (err) {
      addNotification('Registration failed', 'error');
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const price = Number(e.target.price.value);
    const stock = Number(e.target.stock.value);
    try {
      const res = await axios.post('/api/products', { name, price, stock, description: "Premium Product" });
      setProducts([...products, res.data]);
      addNotification(`Product ${name} added to inventory`, 'success');
      e.target.reset();
    } catch (err) {
      addNotification('Failed to add product', 'error');
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return addNotification('Out of stock!', 'error');
    setCart([...cart, { ...product, cartId: Date.now() }]);
    addNotification(`${product.name} added to cart`, 'info');
  };

  const placeOrder = async () => {
    if (!currentUser) return addNotification("Select a user first!", "error");
    if (cart.length === 0) return addNotification("Cart is empty!", "error");

    const orderData = {
      userId: currentUser._id,
      items: cart.map(item => ({
        productId: item._id,
        quantity: 1,
        price: item.price
      })),
      totalAmount: cart.reduce((sum, item) => sum + item.price, 0)
    };

    try {
      const res = await axios.post('/api/orders', orderData);
      setOrders([...orders, res.data]);
      setCart([]);
      addNotification("Order placed! Kafka updating stock...", "success");
      setTimeout(fetchData, 1500); // Wait for Kafka to process
    } catch (err) {
      addNotification("Order failed", "error");
    }
  };

  // Stats Calculations
  const stats = useMemo(() => ({
    revenue: orders.reduce((s, o) => s + o.totalAmount, 0),
    sales: orders.length,
    customers: users.length,
    inventory: products.reduce((s, p) => s + p.stock, 0)
  }), [orders, users, products]);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <span className="logo-text">Stellar API</span>
        </div>

        <nav>
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <Box size={20} /> Inventory
          </div>
          <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={20} /> Customers
          </div>
          <div className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <ShoppingBag size={20} /> Orders
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>SYSTEM STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: systemHealth.kafka ? '#10b981' : '#ef4444' }}></div>
            {systemHealth.kafka ? 'Kafka Connected' : 'Kafka Syncing...'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>
              {activeTab === 'dashboard' && 'System Overview'}
              {activeTab === 'inventory' && 'Inventory Management'}
              {activeTab === 'users' && 'Customer Base'}
              {activeTab === 'orders' && 'Order History'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Real-time microservices monitoring and control</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={fetchData} className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white' }}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            {currentUser && (
              <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                <span style={{ fontWeight: '600' }}>{currentUser.username}</span>
              </div>
            )}
          </div>
        </header>

        {/* Global Stats */}
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <h4>Total Revenue</h4>
              <p>${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <CreditCard size={24} />
            </div>
            <div className="stat-info">
              <h4>Total Sales</h4>
              <p>{stats.sales}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--secondary)' }}>
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h4>Total Customers</h4>
              <p>{stats.customers}</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Box size={24} />
            </div>
            <div className="stat-info">
              <h4>Stock Units</h4>
              <p>{stats.inventory}</p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} color="var(--primary)" /> Live Event Pipeline
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {orders.slice(-5).reverse().map(order => (
                      <div key={order._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem' }}>
                          <CheckCircle2 size={18} color="var(--success)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600' }}>Order #{order._id.slice(-6)} Created</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Payload: {order.items.length} items • ${order.totalAmount}</div>
                        </div>
                        <div className="badge badge-success">Processed</div>
                      </div>
                    ))}
                    {users.slice(-2).reverse().map(user => (
                      <div key={user._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem' }}>
                          <User size={18} color="var(--primary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600' }}>User {user.username} Registered</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Email: {user.email}</div>
                        </div>
                        <div className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>Broadcasted</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button onClick={() => setActiveTab('inventory')} className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', justifyContent: 'flex-start' }}>
                      <PlusCircle size={18} /> Restock Products
                    </button>
                    <button onClick={() => setActiveTab('users')} className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', justifyContent: 'flex-start' }}>
                      <Users size={18} /> Manage Customers
                    </button>
                    <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '1rem', marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--primary)', marginBottom: '0.5rem' }}>Architecture Note</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Order placements trigger an asynchronous event consumed by the Product Service to update stock levels.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div key="inv" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                <div className="card">
                  <h4>Register New Item</h4>
                  <form onSubmit={createProduct} style={{ marginTop: '1.5rem' }}>
                    <input name="name" placeholder="Product Name" required />
                    <input name="price" placeholder="Unit Price ($)" type="number" step="0.01" required />
                    <input name="stock" placeholder="Initial Stock" type="number" required />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add to Catalog</button>
                  </form>
                </div>
                <div className="card">
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginTop: 0 }}>
                    {products.map(p => (
                      <div key={p._id} className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span className={`badge ${p.stock < 10 ? 'badge-warning' : 'badge-success'}`}>
                            {p.stock < 10 ? 'Low Stock' : 'In Stock'}
                          </span>
                          <span style={{ fontWeight: '700' }}>${p.price}</span>
                        </div>
                        <h4 style={{ marginBottom: '0.5rem' }}>{p.name}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Units: {p.stock}</p>
                        <button onClick={() => addToCart(p)} className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                          <ShoppingCart size={16} /> Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="card">
                <h4>Onboard Customer</h4>
                <form onSubmit={registerUser} style={{ marginTop: '1.5rem' }}>
                  <input name="username" placeholder="Username" required />
                  <input name="email" placeholder="Email Address" type="email" required />
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Profile</button>
                </form>
              </div>
              <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <th style={{ padding: '1rem' }}>Customer</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '600' }}>{u.username}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge badge-success">Active</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => setCurrentUser(u)} className={`btn ${currentUser?._id === u._id ? 'btn-primary' : ''}`} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                            {currentUser?._id === u._id ? 'Current' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
                <div className="card">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={18} /> Checkout
                  </h4>
                  
                  {/* User Selection Integration */}
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>SHOPPING AS</label>
                    <select 
                      value={currentUser?._id || ''} 
                      onChange={(e) => setCurrentUser(users.find(u => u._id === e.target.value))}
                      style={{ marginBottom: '1.5rem' }}
                    >
                      <option value="">Select a Customer...</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.username}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: '0rem' }}>
                    {cart.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <AlertCircle size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>Cart is currently empty</p>
                      </div>
                    ) : (
                      <>
                        {cart.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                            <span>{item.name}</span>
                            <span style={{ fontWeight: '600' }}>${item.price}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                            <span>Grand Total</span>
                            <span>${cart.reduce((s, i) => s + i.price, 0).toFixed(2)}</span>
                          </div>
                          <button onClick={placeOrder} className="btn btn-primary" style={{ width: '100%', background: 'var(--success)', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)' }}>
                            Submit Order
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {orders.slice().reverse().map(order => (
                      <div key={order._id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '700' }}>Order #{order._id.slice(-6)}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.875rem' }}>Items: {order.items.length} • Total: <span style={{ color: 'var(--success)', fontWeight: '600' }}>${order.totalAmount}</span></div>
                          <span className="badge badge-success">Delivered</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications */}
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card"
                style={{ 
                  padding: '0.75rem 1.25rem', 
                  minWidth: '240px', 
                  background: n.type === 'error' ? 'var(--danger)' : n.type === 'success' ? 'var(--success)' : 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600' }}>
                  {n.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  {n.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
