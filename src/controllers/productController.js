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
    const { name, category, price, cost_price, stock_quantity, min_stock_level, description } = req.body;
    
    const query = `
        INSERT INTO products (name, category, price, cost_price, stock_quantity, min_stock_level, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [name, category, price, cost_price || 0, stock_quantity || 0, min_stock_level || 10, description], function(err) {
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
    const { name, category, price, cost_price, stock_quantity, min_stock_level, description } = req.body;
    
    const query = `
        UPDATE products 
        SET name = ?, category = ?, price = ?, cost_price = ?, 
            stock_quantity = ?, min_stock_level = ?, description = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ?
    `;
    
    db.run(query, [name, category, price, cost_price, stock_quantity, min_stock_level, description, id], function(err) {
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
    const { quantity_change, change_type, notes } = req.body;
    const user_id = req.user.user_id;
    
    db.serialize(() => {
        // Get current stock
        db.get('SELECT stock_quantity FROM products WHERE product_id = ?', [id], (err, product) => {
            if (err || !product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            
            const quantity_before = product.stock_quantity;
            const quantity_after = quantity_before + parseInt(quantity_change);
            
            // Update product stock
            const updateQuery = 'UPDATE products SET stock_quantity = ? WHERE product_id = ?';
            
            db.run(updateQuery, [quantity_after, id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Log inventory change
                const logQuery = `
                    INSERT INTO inventory_logs 
                    (product_id, user_id, change_type, quantity_before, quantity_change, quantity_after, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                db.run(logQuery, [id, user_id, change_type, quantity_before, quantity_change, quantity_after, notes]);
                
                res.json({ 
                    message: 'Stock updated successfully',
                    quantity_before,
                    quantity_after
                });
            });
        });
    });
};

// Get low stock products
exports.getLowStock = (req, res) => {
    const query = `
        SELECT * FROM products 
        WHERE stock_quantity <= min_stock_level AND is_active = 1
        ORDER BY stock_quantity ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ products: rows });
    });
};
