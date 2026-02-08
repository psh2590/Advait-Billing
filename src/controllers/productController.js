
const db = require('../config/database');

// Get all products
exports.getAllProducts = (req, res) => {
    const query = 'SELECT * FROM products WHERE is_active = 1 ORDER BY category, name';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ products: rows });
    });
};

// Get product by ID
exports.getProductById = (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM products WHERE product_id = ?';
    
    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ product: row });
    });
};

// Add new product
exports.addProduct = (req, res) => {
    const { name, category, price, stock_quantity } = req.body;
    
    const query = `
        INSERT INTO products (name, category, price, stock_quantity)
        VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [name, category, price, stock_quantity], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: 'Product added successfully',
            product_id: this.lastID
        });
    });
};

// Update product
exports.updateProduct = (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock_quantity } = req.body;
    
    const query = `
        UPDATE products 
        SET name = ?, category = ?, price = ?, stock_quantity = ?
        WHERE product_id = ?
    `;
    
    db.run(query, [name, category, price, stock_quantity, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Product updated successfully' });
    });
};

// Delete product (soft delete)
exports.deleteProduct = (req, res) => {
    const { id } = req.params;
    
    const query = 'UPDATE products SET is_active = 0 WHERE product_id = ?';
    
    db.run(query, [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Product deleted successfully' });
    });
};

// Update stock
exports.updateStock = (req, res) => {
    const { id } = req.params;
    const { quantity, change_type, notes } = req.body;
    
    db.serialize(() => {
        // Update product stock
        const updateQuery = `
            UPDATE products 
            SET stock_quantity = stock_quantity + ?
            WHERE product_id = ?
        `;
        
        db.run(updateQuery, [quantity, id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Log inventory change
            const logQuery = `
                INSERT INTO inventory_logs (product_id, change_type, quantity_change, notes)
                VALUES (?, ?, ?, ?)
            `;
            
            db.run(logQuery, [id, change_type, quantity, notes], function(err) {
                if (err) {
                    console.error('Error logging inventory:', err.message);
                }
            });
            
            res.json({ message: 'Stock updated successfully' });
        });
    });
};
