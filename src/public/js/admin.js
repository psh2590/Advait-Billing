// Global variables
let currentUser = null;

// Get token from localStorage
function getToken() {
    return localStorage.getItem('session_token');
}

// API request helper
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('session_token');
        window.location.href = '/';
        return;
    }
    
    return response;
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await verifyAdminSession();
    await loadDashboard();
});

// Verify admin session
async function verifyAdminSession() {
    try {
        const response = await apiRequest('/api/auth/verify');
        const data = await response.json();
        
        if (data.valid) {
            if (data.user.role !== 'admin') {
                alert('Access denied. Admin privileges required.');
                window.location.href = '/cashier';
                return;
            }
            currentUser = data.user;
            document.getElementById('admin-name').textContent = data.user.full_name;
        }
    } catch (error) {
        console.error('Session verification failed:', error);
        window.location.href = '/';
    }
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    event.target.classList.add('active');
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadProducts();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'reports':
            setupReports();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Load Dashboard
async function loadDashboard() {
    try {
        const response = await apiRequest('/api/reports/dashboard');
        const data = await response.json();
        
        // Update stats
        document.getElementById('today-sales').textContent = 
            `₹${data.todaySales.total_sales.toFixed(2)}`;
        document.getElementById('today-bills').textContent = 
            `${data.todaySales.total_bills} bills`;
        document.getElementById('total-products').textContent = data.totalProducts;
        document.getElementById('low-stock').textContent = data.lowStock;
        
        // Update recent bills table
        const tbody = document.getElementById('recent-bills-body');
        tbody.innerHTML = '';
        
        if (data.recentBills.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No recent bills</td></tr>';
            return;
        }
        
        data.recentBills.forEach(bill => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bill.bill_number}</td>
                <td>${bill.cashier_name || 'N/A'}</td>
                <td>₹${bill.total_amount.toFixed(2)}</td>
                <td><span class="status-${bill.payment_status}">${bill.payment_status}</span></td>
                <td>${new Date(bill.created_at).toLocaleString('en-IN')}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Products
async function loadProducts() {
    try {
        const response = await apiRequest('/api/products');
        const data = await response.json();
        
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = '';
        
        if (data.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No products found</td></tr>';
            return;
        }
        
        data.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.product_id}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>₹${product.price.toFixed(2)}</td>
                <td>${product.stock_quantity}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editProduct(${product.product_id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.product_id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load Inventory
async function loadInventory() {
    try {
        const response = await apiRequest('/api/products');
        const data = await response.json();
        
        const inventoryDiv = document.getElementById('inventory-list');
        inventoryDiv.innerHTML = '';
        
        if (data.products.length === 0) {
            inventoryDiv.innerHTML = '<p>No products in inventory</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Min Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="inventory-tbody"></tbody>
        `;
        
        inventoryDiv.appendChild(table);
        const tbody = document.getElementById('inventory-tbody');
        
        data.products.forEach(product => {
            const status = product.stock_quantity <= product.min_stock_level ? 
                          '<span style="color: #ef4444;">⚠️ Low Stock</span>' : 
                          '<span style="color: #10b981;">✓ Good</span>';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.stock_quantity}</td>
                <td>${product.min_stock_level}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-primary" onclick="updateStock(${product.product_id}, '${product.name}')">
                        Update Stock
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// Update Stock
async function updateStock(productId, productName) {
    const change = prompt(`Update stock for "${productName}"\n\nEnter quantity change:\n(Use + for addition, - for reduction)\nExample: +50 or -20`);
    
    if (!change) return;
    
    const quantity_change = parseInt(change);
    
    if (isNaN(quantity_change)) {
        alert('Invalid quantity');
        return;
    }
    
    const notes = prompt('Notes (optional):') || '';
    const change_type = quantity_change > 0 ? 'add' : 'adjustment';
    
    try {
        const response = await apiRequest(`/api/products/${productId}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                quantity_change, 
                change_type, 
                notes 
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Stock updated!\nBefore: ${result.quantity_before}\nAfter: ${result.quantity_after}`);
            loadInventory();
        } else {
            alert('Failed to update stock: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Failed to update stock');
    }
}

// Setup Reports
function setupReports() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('start-date').value = weekAgo;
    document.getElementById('end-date').value = today;
}

// Generate Report
async function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    try {
        const response = await apiRequest(`/api/reports/sales?start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json();
        
        const resultsDiv = document.getElementById('report-results');
        
        if (data.report.length === 0) {
            resultsDiv.innerHTML = '<p>No sales data for selected period</p>';
            return;
        }
        
        let totalSales = 0;
        let totalBills = 0;
        
        let tableHTML = `
            <h3>Sales Report: ${startDate} to ${endDate}</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Bills</th>
                        <th>Subtotal</th>
                        <th>Tax</th>
                        <th>Discount</th>
                        <th>Total Sales</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.report.forEach(day => {
            totalSales += day.total_sales;
            totalBills += day.total_bills;
            
            tableHTML += `
                <tr>
                    <td>${day.date}</td>
                    <td>${day.total_bills}</td>
                    <td>₹${day.subtotal.toFixed(2)}</td>
                    <td>₹${day.tax.toFixed(2)}</td>
                    <td>₹${day.discount.toFixed(2)}</td>
                    <td>₹${day.total_sales.toFixed(2)}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background: #f1f5f9;">
                        <td>TOTAL</td>
                        <td>${totalBills}</td>
                        <td colspan="3"></td>
                        <td>₹${totalSales.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        resultsDiv.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
}

// Load Users
async function loadUsers() {
    try {
        const response = await apiRequest('/api/auth/users');
        const data = await response.json();
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        if (data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No users found</td></tr>';
            return;
        }
        
        data.users.forEach(user => {
            const row = document.createElement('tr');
            const lastLogin = user.last_login ? 
                             new Date(user.last_login).toLocaleString('en-IN') : 
                             'Never';
            const status = user.is_active ? 
                          '<span style="color: #10b981;">Active</span>' : 
                          '<span style="color: #ef4444;">Inactive</span>';
            
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td>${user.role}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${lastLogin}</td>
                <td>${status}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Show Add Product Modal
function showAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'block';
}

// Close Add Product Modal
function closeAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'none';
    document.getElementById('add-product-form').reset();
}

// Add Product Form Handler
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        name: formData.get('name'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        stock_quantity: parseInt(formData.get('stock_quantity')),
        description: formData.get('description')
    };
    
    try {
        const response = await apiRequest('/api/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Product added successfully!');
            closeAddProductModal();
            loadProducts();
        } else {
            alert('Failed to add product: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product');
    }
});

// Edit Product
async function editProduct(productId) {
    try {
        const response = await apiRequest(`/api/products/${productId}`);
        const data = await response.json();
        const product = data.product;
        
        const name = prompt('Product Name:', product.name);
        if (!name) return;
        
        const category = prompt('Category:', product.category);
        if (!category) return;
        
        const price = prompt('Price:', product.price);
        if (!price) return;
        
        const stock = prompt('Stock Quantity:', product.stock_quantity);
        if (!stock) return;
        
        const updateData = {
            name,
            category,
            price: parseFloat(price),
            stock_quantity: parseInt(stock),
            cost_price: product.cost_price,
            min_stock_level: product.min_stock_level,
            description: product.description
        };
        
        const updateResponse = await apiRequest(`/api/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
            alert('Product updated successfully!');
            loadProducts();
        } else {
            alert('Failed to update product');
        }
    } catch (error) {
        console.error('Error editing product:', error);
        alert('Failed to edit product');
    }
}

// Delete Product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await apiRequest(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Product deleted successfully!');
            loadProducts();
        } else {
            alert('Failed to delete product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
    }
}

// Show Add User Modal
function showAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'block';
}

// Close Add User Modal
function closeAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'none';
    document.getElementById('add-user-form').reset();
}

// Add User Form Handler
document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('username'),
        password: formData.get('password'),
        full_name: formData.get('full_name'),
        role: formData.get('role'),
        email: formData.get('email')
    };
    
    try {
        const response = await apiRequest('/api/auth/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('User added successfully!');
            closeAddUserModal();
            loadUsers();
        } else {
            alert('Failed to add user: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding user:', error);
        alert('Failed to add user');
    }
});

// Logout
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('session_token');
            window.location.href = '/';
        }
    }
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
