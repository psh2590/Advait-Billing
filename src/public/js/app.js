// Global variables
let products = [];
let billItems = [];
let currentBillId = null;
let currentPaymentId = null;
const TAX_RATE = 0.05;

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
    
    if (response.status === 401) {
        // Unauthorized, redirect to login
        localStorage.removeItem('session_token');
        window.location.href = '/';
        return;
    }
    
    return response;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await verifySession();
    await loadProducts();
});

// Verify session
async function verifySession() {
    try {
        const response = await apiRequest('/api/auth/verify');
        const data = await response.json();
        
        if (data.valid) {
            document.getElementById('cashier-name').textContent = `Cashier: ${data.user.full_name}`;
        }
    } catch (error) {
        console.error('Session verification failed:', error);
        window.location.href = '/';
    }
}

// Load all products
async function loadProducts() {
    try {
        const response = await apiRequest('/api/products');
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
    document.querySelectorAll('.btn-category').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
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
        const discount = parseFloat(document.getElementById('discount-input').value) || 0;
        
        const billData = {
            items: billItems,
            discount: discount
        };
        
        const billResponse = await apiRequest('/api/bills', {
            method: 'POST',
            body: JSON.stringify(billData)
        });
        
        const billResult = await billResponse.json();
        currentBillId = billResult.bill_id;
        
        const qrResponse = await apiRequest('/api/payments/generate-qr', {
            method: 'POST',
            body: JSON.stringify({ bill_id: currentBillId })
        });
        
        const qrResult = await qrResponse.json();
        currentPaymentId = qrResult.payment_id;
        
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
        const response = await apiRequest('/api/payments/confirm', {
            method: 'POST',
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

// Get bill data for receipt/WhatsApp
function getBillData() {
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('₹', ''));
    const tax = parseFloat(document.getElementById('tax').textContent.replace('₹', ''));
    const discount = parseFloat(document.getElementById('discount-input').value) || 0;
    const total = parseFloat(document.getElementById('total').textContent.replace('₹', ''));
    
    return {
        billNumber: document.getElementById('qr-bill-number') ? 
                    document.getElementById('qr-bill-number').textContent : 
                    'BILL' + Date.now(),
        date: new Date().toLocaleString('en-IN'),
        cashier: document.getElementById('cashier-name').textContent.replace('Cashier: ', ''),
        items: billItems,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        total: total,
        qrCode: document.getElementById('qr-code-image') ? 
                document.getElementById('qr-code-image').src : null
    };
}

// Send bill via WhatsApp
function sendBillViaWhatsApp() {
    const billData = getBillData();
    
    const mobile = prompt('Enter customer mobile number (10 digits):');
    
    if (!mobile || mobile.length !== 10) {
        alert('Please enter valid 10-digit mobile number');
        return;
    }
    
    const billText = formatBillForWhatsApp(billData);
    const whatsappURL = `https://wa.me/91${mobile}?text=${encodeURIComponent(billText)}`;
    window.open(whatsappURL, '_blank');
    
    alert('WhatsApp opened! Click Send to deliver bill to customer.');
}

// Format bill for WhatsApp
function formatBillForWhatsApp(data) {
    let message = `🍽️ *COLLEGE CANTEEN RECEIPT*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📄 *Bill No:* ${data.billNumber}\n`;
    message += `📅 *Date:* ${data.date}\n`;
    message += `👤 *Cashier:* ${data.cashier}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*ITEMS:*\n\n`;
    
    data.items.forEach(item => {
        message += `• ${item.name}\n`;
        message += `  ${item.quantity} x ₹${item.unit_price.toFixed(2)} = ₹${(item.quantity * item.unit_price).toFixed(2)}\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*Subtotal:* ₹${data.subtotal.toFixed(2)}\n`;
    message += `*Tax (5%):* ₹${data.tax.toFixed(2)}\n`;
    
    if (data.discount > 0) {
        message += `*Discount:* -₹${data.discount.toFixed(2)}\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*TOTAL: ₹${data.total.toFixed(2)}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `✅ Payment Status: Paid\n\n`;
    message += `Thank you for visiting! 🙏\n`;
    message += `Have a great day! 😊`;
    
    return message;
}

// Print Receipt
function printReceipt() {
    const billData = getBillData();
    const receiptHTML = generateReceiptHTML(billData);
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
}

// Generate receipt HTML
function generateReceiptHTML(data) {
    let itemsHTML = '';
    data.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td>${item.name}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">₹${item.unit_price.toFixed(2)}</td>
                <td class="right">₹${(item.quantity * item.unit_price).toFixed(2)}</td>
            </tr>
        `;
    });
    
    const qrSection = data.qrCode ? `
        <div class="qr-section">
            <p><strong>Scan to Pay</strong></p>
            <img src="${data.qrCode}" alt="Payment QR Code">
            <p>Scan with any UPI app</p>
        </div>
    ` : '';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${data.billNumber}</title>
    <style>
        @media print {
            body { margin: 0; }
        }
        
        body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
        }
        
        .header h2 { margin: 5px 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 10px; }
        
        .bill-info { margin: 10px 0; font-size: 11px; }
        
        table { width: 100%; margin: 10px 0; border-collapse: collapse; }
        th { border-bottom: 1px solid #000; padding: 5px 2px; text-align: left; font-size: 11px; }
        td { padding: 5px 2px; font-size: 11px; }
        .right { text-align: right; }
        
        .totals {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
        }
        
        .totals .row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11px;
        }
        
        .totals .total-row {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            margin-top: 5px;
            padding-top: 5px;
        }
        
        .footer {
            text-align: center;
            margin-top: 15px;
            border-top: 2px dashed #000;
            padding-top: 10px;
            font-size: 10px;
        }
        
        .qr-section {
            text-align: center;
            margin: 15px 0;
            padding: 10px 0;
            border: 1px dashed #000;
        }
        
        .qr-section img { width: 150px; height: 150px; }
        
        @media print {
            @page { size: 80mm auto; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🍽️ COLLEGE CANTEEN</h2>
        <p>AdvaitPrime College</p>
        <p>Campus Road, City - 400001</p>
        <p>Ph: +91 98765 43210</p>
    </div>
    
    <div class="bill-info">
        <div><strong>Bill No:</strong> ${data.billNumber}</div>
        <div><strong>Date:</strong> ${data.date}</div>
        <div><strong>Cashier:</strong> ${data.cashier}</div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>
    
    <div class="totals">
        <div class="row">
            <span>Subtotal:</span>
            <span>₹${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="row">
            <span>Tax (5%):</span>
            <span>₹${data.tax.toFixed(2)}</span>
        </div>
        ${data.discount > 0 ? `
        <div class="row">
            <span>Discount:</span>
            <span>-₹${data.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="row total-row">
            <span>TOTAL:</span>
            <span>₹${data.total.toFixed(2)}</span>
        </div>
    </div>
    
    ${qrSection}
    
    <div class="footer">
        <p><strong>Thank You! Visit Again</strong></p>
        <p>*** HAVE A GREAT DAY ***</p>
    </div>
    
    <script>
        window.onload = function() { window.print(); };
    </script>
</body>
</html>
    `;
}

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
