const db = require('../config/database');

// Generate unique bill number
function generateBillNumber() {
    const date = new Date();
    const timestamp = date.getTime();
    return `BILL${timestamp}`;
}

// Create new bill
exports.createBill = (req, res) => {
    const { items, discount } = req.body;
    const cashier_id = req.user.user_id;
    
    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.quantity * item.unit_price;
    });
    
    const tax_rate = parseFloat(process.env.TAX_RATE) || 0.05;
    const tax_amount = subtotal * tax_rate;
    const total_amount = subtotal + tax_amount - (discount || 0);
    const bill_number = generateBillNumber();
    
    db.serialize(() => {
        // Insert bill
        const billQuery = `
            INSERT INTO bills (bill_number, cashier_id, subtotal, tax_amount, discount, total_amount)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(billQuery, [bill_number, cashier_id, subtotal, tax_amount, discount, total_amount], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const bill_id = this.lastID;
            
            // Insert bill items
            const itemQuery = `
                INSERT INTO bill_items (bill_id, product_id, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const stmt = db.prepare(itemQuery);
            items.forEach(item => {
                const item_subtotal = item.quantity * item.unit_price;
                stmt.run([bill_id, item.product_id, item.quantity, item.unit_price, item_subtotal]);
                
                // Update product stock
                db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', 
                       [item.quantity, item.product_id]);
                
                // Log inventory
                db.run(`INSERT INTO inventory_logs (product_id, change_type, quantity_change, notes) 
                        VALUES (?, 'sale', ?, ?)`, 
                       [item.product_id, -item.quantity, `Bill #${bill_number}`]);
            });
            stmt.finalize();
            
            res.json({
                message: 'Bill created successfully',
                bill_id: bill_id,
                bill_number: bill_number,
                total_amount: total_amount
            });
        });
    });
};

// Get bill by ID
exports.getBillById = (req, res) => {
    const { id } = req.params;
    
    const billQuery = `
        SELECT b.*, u.full_name as cashier_name 
        FROM bills b
        LEFT JOIN users u ON b.cashier_id = u.user_id
        WHERE b.bill_id = ?
    `;
    
    const itemsQuery = `
        SELECT bi.*, p.name as product_name 
        FROM bill_items bi
        JOIN products p ON bi.product_id = p.product_id
        WHERE bi.bill_id = ?
    `;
    
    db.get(billQuery, [id], (err, bill) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        db.all(itemsQuery, [id], (err, items) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            bill.items = items;
            res.json({ bill: bill });
        });
    });
};

// Get all bills
exports.getAllBills = (req, res) => {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT b.*, u.full_name as cashier_name 
        FROM bills b
        LEFT JOIN users u ON b.cashier_id = u.user_id
    `;
    let params = [];
    
    if (status) {
        query += ' WHERE b.payment_status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ bills: rows });
    });
};

// Update payment status
exports.updatePaymentStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const query = 'UPDATE bills SET payment_status = ? WHERE bill_id = ?';
    
    db.run(query, [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Payment status updated' });
    });
};

// Get daily sales report
exports.getDailySales = (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
        SELECT 
            COUNT(*) as total_bills,
            SUM(total_amount) as total_sales,
            SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
            SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_amount
        FROM bills
        WHERE DATE(created_at) = ?
    `;
    
    db.get(query, [targetDate], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ report: row, date: targetDate });
    });
};
