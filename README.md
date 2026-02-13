# 🍽️ College Canteen Billing System

Modern billing software with QR code payments, inventory management, and admin dashboard.

## Features

- ✅ User Authentication (Admin/Cashier roles)
- ✅ Product Management
- ✅ QR Code Payment Generation (UPI)
- ✅ Inventory Tracking
- ✅ Sales Reports & Analytics
- ✅ WhatsApp Bill Sharing
- ✅ Receipt Printing
- ✅ Multi-counter Support
- ✅ Offline Capable

## Installation

1. Install Node.js (v18 or higher)
2. Clone/Download this project
3. Open terminal in project folder
4. Run: `npm install`
5. Run: `npm start`
6. Open browser: http://localhost:3000

## Default Login Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`

**Cashier:**
- Username: `cashier1`
- Password: `admin123`

⚠️ **IMPORTANT:** Change these passwords after first login!

## Configuration

Edit `.env` file to configure:
- `UPI_ID`: Your UPI ID for payments
- `MERCHANT_NAME`: Your canteen name
- `PORT`: Server port (default 3000)

## Usage

### For Cashiers:
1. Login with cashier credentials
2. Click items to add to bill
3. Generate QR code for payment
4. Confirm payment when received
5. Print/WhatsApp receipt

### For Admin:
1. Login with admin credentials
2. Access Admin Dashboard
3. Manage products, inventory, users
4. View sales reports

## Support

For issues or questions, contact: your-email@example.com

## License

Proprietary Software - Licensed to specific client only.
Unauthorized copying or distribution is prohibited.

Copyright © 2026 Your Company Name
