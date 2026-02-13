-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'cashier',
    email VARCHAR(100),
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    image_url VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills Table
CREATE TABLE IF NOT EXISTS bills (
    bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number VARCHAR(20) UNIQUE NOT NULL,
    cashier_id INTEGER,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cashier_id) REFERENCES users(user_id)
);

-- Bill Items Table
CREATE TABLE IF NOT EXISTS bill_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    qr_code_data TEXT,
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'initiated',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
);

-- Inventory Logs Table
CREATE TABLE IF NOT EXISTS inventory_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    change_type VARCHAR(20),
    quantity_before INTEGER,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Insert Default Users (password: admin123)
INSERT OR IGNORE INTO users (user_id, username, password_hash, full_name, role, email) VALUES
(1, 'admin', '$2b$10$8K1p/a0dL3LKDLwA9mNEqOXLbfNwZLmOhEWGzpWlRv5KYLmvLJKpK', 'System Administrator', 'admin', 'admin@canteen.com'),
(2, 'cashier1', '$2b$10$8K1p/a0dL3LKDLwA9mNEqOXLbfNwZLmOhEWGzpWlRv5KYLmvLJKpK', 'Cashier One', 'cashier', 'cashier1@canteen.com');

-- Insert Sample Products
INSERT OR IGNORE INTO products (product_id, name, category, price, cost_price, stock_quantity, min_stock_level, description) VALUES
(1, 'Masala Chai', 'Beverages', 12.00, 5.00, 100, 20, 'Hot aromatic tea with Indian spices'),
(2, 'Filter Coffee', 'Beverages', 15.00, 6.00, 100, 20, 'Fresh South Indian filter coffee'),
(3, 'Cold Coffee', 'Beverages', 30.00, 12.00, 50, 15, 'Chilled coffee with ice cream'),
(4, 'Lassi', 'Beverages', 25.00, 10.00, 60, 15, 'Refreshing yogurt-based drink'),
(5, 'Samosa', 'Snacks', 10.00, 4.00, 100, 25, 'Crispy fried pastry with spiced filling'),
(6, 'Vada Pav', 'Snacks', 15.00, 6.00, 80, 20, 'Mumbai special potato fritter sandwich'),
(7, 'Sandwich', 'Snacks', 35.00, 15.00, 50, 15, 'Grilled vegetable sandwich'),
(8, 'Pav Bhaji', 'Snacks', 50.00, 20.00, 40, 10, 'Spiced vegetable mash with bread'),
(9, 'Veg Thali', 'Meals', 70.00, 30.00, 50, 10, 'Complete meal with rice, roti, dal, vegetables'),
(10, 'Dosa', 'Meals', 40.00, 15.00, 60, 15, 'Crispy South Indian crepe'),
(11, 'Idli (2 pcs)', 'Meals', 25.00, 10.00, 80, 20, 'Steamed rice cakes with sambar'),
(12, 'Paneer Paratha', 'Meals', 45.00, 18.00, 40, 10, 'Flatbread stuffed with cottage cheese'),
(13, 'Gulab Jamun', 'Desserts', 20.00, 8.00, 60, 15, 'Sweet fried dumplings in sugar syrup'),
(14, 'Ice Cream Cup', 'Desserts', 25.00, 10.00, 100, 20, 'Vanilla ice cream cup'),
(15, 'Cake Slice', 'Desserts', 30.00, 12.00, 40, 10, 'Fresh chocolate cake slice');
