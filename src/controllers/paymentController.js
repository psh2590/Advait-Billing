
const db = require('../config/database');
const QRCode = require('qrcode');

// Generate UPI QR Code
exports.generateQRCode = async (req, res) => {
    const { bill_id } = req.body;
    
    // Get bill details
    db.get('SELECT * FROM bills WHERE bill_id = ?', [bill_id], async (err, bill) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        // Create UPI payment string
        const upiId = process.env.UPI_ID || 'merchant@upi';
        const merchantName = process.env.MERCHANT_NAME || 'College Canteen';
        const amount = bill.total_amount;
        const billNumber = bill.bill_number;
        
        const upiString = `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amount}&tn=Bill_${billNumber}&cu=INR`;
        
        try {
            // Generate QR code as base64 image
            const qrCodeImage = await QRCode.toDataURL(upiString);
            
            // Save payment record
            const paymentQuery = `
                INSERT INTO payments (bill_id, payment_method, qr_code_data, status)
                VALUES (?, 'UPI', ?, 'initiated')
            `;
            
            db.run(paymentQuery, [bill_id, upiString], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                res.json({
                    message: 'QR Code generated successfully',
                    payment_id: this.lastID,
                    qr_code: qrCodeImage,
                    upi_string: upiString,
                    amount: amount,
                    bill_number: billNumber
                });
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate QR code' });
        }
    });
};

// Check payment status (Manual)
exports.checkPaymentStatus = (req, res) => {
    const { payment_id } = req.params;
    
    const query = `
        SELECT p.*, b.bill_number, b.total_amount 
        FROM payments p
        JOIN bills b ON p.bill_id = b.bill_id
        WHERE p.payment_id = ?
    `;
    
    db.get(query, [payment_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json({ payment: row });
    });
};

// Confirm payment (Manual confirmation by cashier)
exports.confirmPayment = (req, res) => {
    const { payment_id } = req.body;
    const { transaction_id } = req.body;
    
    db.serialize(() => {
        // Update payment status
        const paymentQuery = `
            UPDATE payments 
            SET status = 'success', transaction_id = ?, paid_at = CURRENT_TIMESTAMP
            WHERE payment_id = ?
        `;
        
        db.run(paymentQuery, [transaction_id, payment_id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Get bill_id from payment
            db.get('SELECT bill_id FROM payments WHERE payment_id = ?', [payment_id], (err, row) => {
                if (err || !row) {
                    return res.status(500).json({ error: 'Failed to update bill' });
                }
                
                // Update bill status
                db.run('UPDATE bills SET payment_status = ? WHERE bill_id = ?', 
                       ['paid', row.bill_id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'Payment confirmed successfully' });
                });
            });
        });
    });
};

// Get payment history
exports.getPaymentHistory = (req, res) => {
    const { limit = 50, status } = req.query;
    
    let query = `
        SELECT p.*, b.bill_number, b.total_amount 
        FROM payments p
        JOIN bills b ON p.bill_id = b.bill_id
    `;
    let params = [];
    
    if (status) {
        query += ' WHERE p.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT ?';
    params.push(limit);
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ payments: rows });
    });
};
