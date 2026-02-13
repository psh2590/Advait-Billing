require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);

// Report routes
const reportController = require('./controllers/reportController');
const { requireAuth, requireAdmin } = require('./middleware/auth');

app.get('/api/reports/dashboard', requireAuth, requireAdmin, reportController.getDashboardStats);
app.get('/api/reports/sales', requireAuth, requireAdmin, reportController.getSalesReport);
app.get('/api/reports/top-products', requireAuth, requireAdmin, reportController.getTopProducts);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/cashier', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Login page: http://localhost:${PORT}\n`);
    console.log(`👤 Default Credentials:`);
    console.log(`   Admin: username=admin, password=admin123`);
    console.log(`   Cashier: username=cashier1, password=admin123\n`);
});
