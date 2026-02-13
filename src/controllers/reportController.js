const db = require('../config/database');

// Get dashboard stats
exports.getDashboardStats = (req, res) => {
    const queries = {
        todaySales: `
            SELECT 
                COUNT(*) as total_bills,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount
            FROM bills
            WHERE DATE(created_at) = DATE('now')
        `,
        lowStock: `
            SELECT COUNT(*) as count
            FROM products
            WHERE stock_quantity <= min_stock_level AND is_active = 1
        `,
        totalProducts: `
            SELECT COUNT(*) as count
            FROM products
            WHERE is_active = 1
        `,
        recentBills: `
            SELECT b.*, u.full_name as cashier_name
            FROM bills b
            LEFT JOIN users u ON b.cashier_id = u.user_id
            ORDER BY b.created_at DESC
            LIMIT 10
        `
    };
    
    const results = {};
    
    db.get(queries.todaySales, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        results.todaySales = row;
        
        db.get(queries.lowStock, [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            results.lowStock = row.count;
            
            db.get(queries.totalProducts, [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                results.totalProducts = row.count;
                
                db.all(queries.recentBills, [], (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    results.recentBills = rows;
                    
                    res.json(results);
                });
            });
        });
    });
};

// Get sales by date range
exports.getSalesReport = (req, res) => {
    const { start_date, end_date } = req.query;
    
    const query = `
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_bills,
            SUM(total_amount) as total_sales,
            SUM(subtotal) as subtotal,
            SUM(tax_amount) as tax,
            SUM(discount) as discount
        FROM bills
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    `;
    
    db.all(query, [start_date || '2020-01-01', end_date || '2030-12-31'], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ report: rows });
    });
};

// Get top selling products
exports.getTopProducts = (req, res) => {
    const { limit = 10 } = req.query;
    
    const query = `
        SELECT 
            p.product_id,
            p.name,
            p.category,
            p.price,
            COUNT(bi.item_id) as times_sold,
            SUM(bi.quantity) as total_quantity,
            SUM(bi.subtotal) as total_revenue
        FROM products p
        JOIN bill_items bi ON p.product_id = bi.product_id
        JOIN bills b ON bi.bill_id = b.bill_id
        WHERE b.payment_status = 'paid'
        GROUP BY p.product_id
        ORDER BY total_revenue DESC
        LIMIT ?
    `;
    
    db.all(query, [limit], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ products: rows });
    });
};
