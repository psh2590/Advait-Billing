// Global variables
let products = [];
let billItems = [];
let currentBillId = null;
let currentPaymentId = null;
const TAX_RATE = 0.05;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

// Load all products
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        products = data.products;
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Failed to load products');
    }
}

// Display products
function displayProducts(productsToDisplay) {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        productsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #64748b;">No products found</p>';
        return;
    }
    
    productsToDisplay.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.onclick = () => addToBill(product);
        
        productDiv.innerHTML = `
            <div class="product-info">
                <h3>${product.name}</h3>
                <span class="category">${product.category}</span>
            </div>
            <div class="product-price">₹${product.price.toFixed(2)}</div>
        `;
        
        productsList.appendChild(productDiv);
    });
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('search-product').value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.category.toLowerCase().includes(searchTerm)
    );
    displayProducts(filtered);
}

// Filter by category
function filterCategory(category) {
    // Update active button
    document.querySelectorAll('.btn-category').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter products
    if (category === 'all') {
        displayProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        displayProducts(filtered);
    }
}

// Add product to bill
function addToBill(product) {
    const existingItem = billItems.find(item => item.product_id === product.product_id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        billItems.push({
            product_id: product.product_id,
            name: product.name,
            unit_price: product.price,
            quantity: 1
        });
    }
    
    updateBillDisplay();
}

// Update bill display
function updateBillDisplay() {
    const billItemsDiv = document.getElementById('bill-items');
    
    if (billItems.length === 0) {
        billItemsDiv.innerHTML = `
            <div class="empty-bill">
                <p>No items added yet</p>
                <p class="hint">Click on menu items to add to bill</p>
            </div>
        `;
        document.getElementById('generate-qr-btn').disabled = true;
    } else {
        billItemsDiv.innerHTML = '';
        
        billItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'bill-item';
            
            const itemTotal = item.quantity * item.unit_price;
            
            itemDiv.innerHTML = `
                <div class="bill-item-info">
                    <div class="bill-item-name">${item.name}</div>
                    <div class="bill-item-price">₹${item.unit_price.toFixed(2)} each</div>
                </div>
                <div class="bill-item-qty">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <div class="bill-item-total">₹${itemTotal.toFixed(2)}</div>
                <button class="btn-remove" onclick="removeItem(${index})">✕</button>
            `;
            
            billItemsDiv.appendChild(itemDiv);
        });
        
        document.getElementById('generate-qr-btn').disabled = false;
    }
    
    calculateTotal();
}

// Update item quantity
function updateQuantity(index, change) {
    billItems[index].quantity += change;
    
    if (billItems[index].quantity <= 0) {
        billItems.splice(index, 1);
    }
    
    updateBillDisplay();
}

// Remove item from bill
function removeItem(index) {
    billItems.splice(index, 1);
    updateBillDisplay();
}

// Calculate total
function calculateTotal() {
    const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discount = parseFloat(document.getElementById('discount-input').value) || 0;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax - discount;
    
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `₹${total.toFixed(2)}`;
}

// Clear bill
function clearBill() {
    if (billItems.length > 0) {
        if (confirm('Are you sure you want to clear the current bill?')) {
            billItems = [];
            document.getElementById('discount-input').value = 0;
            updateBillDisplay();
        }
    }
}

// Generate QR Code
async function generateQR() {
    if (billItems.length === 0) {
        alert('Please add items to the bill first');
        return;
    }
    
    try {
        // First create the bill
        const discount = parseFloat(document.getElementById('discount-input').value) || 0;
        
        const billData = {
            cashier_id: 1, // Default admin user
            items: billItems,
            discount: discount
        };
        
        const billResponse = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData)
        });
        
        const billResult = await billResponse.json();
        currentBillId = billResult.bill_id;
        
        // Generate QR code
        const qrResponse = await fetch('/api/payments/generate-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bill_id: currentBillId })
        });
        
        const qrResult = await qrResponse.json();
        currentPaymentId = qrResult.payment_id;
        
        // Display QR modal
        document.getElementById('qr-amount').textContent = `₹${qrResult.amount.toFixed(2)}`;
        document.getElementById('qr-bill-number').textContent = qrResult.bill_number;
        document.getElementById('qr-code-image').src = qrResult.qr_code;
        document.getElementById('qr-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error generating QR:', error);
        alert('Failed to generate QR code');
    }
}

// Close QR Modal
function closeQRModal() {
    document.getElementById('qr-modal').style.display = 'none';
}

// Confirm Payment
async function confirmPayment() {
    const transactionId = prompt('Enter transaction ID (or press OK for manual confirmation):');
    
    try {
        const response = await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payment_id: currentPaymentId,
                transaction_id: transactionId || `MANUAL_${Date.now()}`
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeQRModal();
            document.getElementById('success-modal').style.display = 'block';
        } else {
            alert('Failed to confirm payment: ' + result.error);
        }
    } catch (error) {
        console.error('Error confirming payment:', error);
        alert('Failed to confirm payment');
    }
}

// Close Success Modal and reset
function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
    billItems = [];
    document.getElementById('discount-input').value = 0;
    currentBillId = null;
    currentPaymentId = null;
    updateBillDisplay();
}

// Print Receipt
function printReceipt() {
    window.print();
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        location.reload();
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
