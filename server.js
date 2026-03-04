const express = require('express');
const pdf = require('html-pdf');
const cors = require('cors');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const { getTransactionData, testConnection, initializeDatabase } = require('./database');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3002;

// Absolute logo path for PDF rendering (wkhtmltopdf / PhantomJS may need file:// URL)
const PDF_LOGO_PATH = `file:///${path.join(__dirname, 'public', 'images', 'logo.png').replace(/\\/g, '/')}`;

// Pre-load logo as base64 so PDFs don't depend on file path resolution
let LOGO_DATA_URL = null;
try {
    const logoFilePath = path.join(__dirname, 'public', 'images', 'logo.png');
    if (fs.existsSync(logoFilePath)) {
        const logoBuffer = fs.readFileSync(logoFilePath);
        // Assume PNG logo as per LOGO_INSTRUCTIONS.md
        LOGO_DATA_URL = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        console.log('✅ Loaded logo for invoice template.');
    } else {
        console.warn('⚠️ Logo file not found at public/images/logo.png - invoice will show text placeholder.');
    }
} catch (e) {
    console.warn('⚠️ Failed to load logo file for invoice template:', e.message);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Number to words conversion function
function numberToWords(num) {
    if (num === 0) return "Zero";
    
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Million", "Billion"];
    
    function convertHundreds(n) {
        let result = "";
        
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + " Hundred";
            n %= 100;
            if (n > 0) result += " ";
        }
        
        if (n >= 20) {
            result += tens[Math.floor(n / 10)];
            n %= 10;
            if (n > 0) result += " " + ones[n];
        } else if (n >= 10) {
            result += teens[n - 10];
        } else if (n > 0) {
            result += ones[n];
        }
        
        return result;
    }
    
    let result = "";
    let thousandIndex = 0;
    
    while (num > 0) {
        if (num % 1000 !== 0) {
            let chunk = convertHundreds(num % 1000);
            if (thousandIndex > 0) {
                chunk += " " + thousands[thousandIndex];
            }
            result = chunk + (result ? " " + result : "");
        }
        num = Math.floor(num / 1000);
        thousandIndex++;
    }
    
    return result;
}

// Generate invoice HTML
function generateInvoiceHTML(data, options = {}) {
    const { isPdf = false } = options;
    const {
        payerName = "",
        payerAccount = "",
        creditedPartyName = "",
        creditedPartyAccount = "",
        transactionRef = "",
        transactionType = "",
        receiptNo = "",
        paymentDate = new Date(),
        amount = 0.00,
        serviceCharge = 0.00,
        vat = 0.00,
        paymentMode = "",
        paymentReason = ""
    } = data;

    const totalAmount = amount + serviceCharge + vat;
    const amountInWords = numberToWords(Math.floor(totalAmount)) + " Birr Only";
    const formattedDate = moment(paymentDate).format('DD/MM/YYYY');
    // Prefer embedded base64 logo for both browser and PDF; fall back to path if missing
    const logoSrc = LOGO_DATA_URL || (isPdf ? PDF_LOGO_PATH : '/images/logo.png');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enat Bank Payment Receipt</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: #fff;
            }
            
            .invoice-container {
                width: 100%;
                max-width: 800px;
                /* Extra top margin so printed PDF has more space from page top */
                margin: 25mm auto 0 auto;
                padding: 10px 20px;
                background: #fff;
            }
            
            .receipt-title-bar {
                width: 100%;
                border: 1px solid #000;
                border-bottom: none;
                text-align: center;
                padding: 6px 0;
                font-weight: bold;
                font-size: 14px;
                letter-spacing: 0.5px;
            }
            
            .header {
                display: table;
                width: 100%;
                border: 1px solid #000;
                border-top: none;
                padding: 6px 8px;
                table-layout: fixed;
                margin-bottom: 8px;
            }
            
            .header > div {
                display: table-cell;
                vertical-align: top;
            }
            
            .logo-section {
                width: 120px;
                text-align: left;
            }
            
            .logo-section img {
                max-width: 110px;
                max-height: 70px;
            }
            
            .bank-center {
                text-align: center;
                font-size: 11px;
                font-weight: bold;
            }
            
            .bank-center .bank-name {
                font-size: 14px;
                margin-bottom: 2px;
            }
            
            .bank-center .bank-subtitle {
                font-size: 11px;
            }
            
            .bank-right {
                text-align: left;
                font-size: 10px;
            }
            
            .bank-right div {
                line-height: 1.5;
            }
            
            .section {
                margin-bottom: 8px;
                border: 1px solid #000;
                border-collapse: collapse;
                padding: 0;
            }
            
            .section-title {
                text-align: center;
                font-size: 12px;
                font-weight: bold;
                border-bottom: 1px solid #000;
                padding: 4px 0;
                background: #f5f5f5;
            }
            
            .info-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .info-row {
                border-bottom: 1px solid #000;
            }
            
            .info-row:last-child {
                border-bottom: none;
            }
            
            .info-label,
            .info-value {
                padding: 3px 8px;
                font-size: 10px;
            }
            
            .info-label {
                width: 35%;
                font-weight: bold;
            }
            
            .info-value {
                width: 65%;
            }
            
            .total-row .info-label,
            .total-row .info-value {
                font-weight: bold;
            }
            
            .amount-in-words {
                margin-top: 0;
                border-top: 1px solid #000;
                background: #f5f5f5;
            }
            
            .amount-in-words-label,
            .amount-in-words-text {
                padding: 4px 8px;
                font-size: 10px;
            }
            
            .amount-in-words-label {
                font-weight: bold;
                width: 25%;
                display: inline-block;
            }
            
            .amount-in-words-text {
                display: inline-block;
                width: 70%;
            }
            
            .footer {
                text-align: center;
                margin-top: 16px;
                padding: 8px 0;
                font-weight: bold;
                font-size: 10px;
            }
            
            /* Print-specific styles for PDF generation */
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                }
                .invoice-container {
                    padding: 10px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Top title bar -->
            <div class="receipt-title-bar">
                PAYMENT RECIEPT
            </div>
            
            <!-- Header -->
            <div class="header">
                <div class="logo-section">
                    <img src="${logoSrc}" alt="Enat Bank Logo">
                </div>
                <div class="bank-center">
                    <div class="bank-name">ENAT BANK</div>
                    <div class="bank-subtitle">Kirkos Sub-City, Woreda 8, Addis Ababa</div>
                </div>
                <div class="bank-right">
                    <div>VAT Reg. Number&nbsp;&nbsp;&nbsp;&nbsp;6935790003</div>
                    <div>Tin No.&nbsp;&nbsp;&nbsp;&nbsp;0036793983</div>
                    <div>P.O.Box&nbsp;&nbsp;&nbsp;&nbsp;18401</div>
                    <div>Telephone&nbsp;&nbsp;&nbsp;&nbsp;+251115589416</div>
                    <div>Fax&nbsp;&nbsp;&nbsp;&nbsp;251115151338</div>
                </div>
            </div>
            
            <!-- Transaction Information -->
            <div class="section">
                <div class="section-title">TRANSACTION INFORMATION</div>
                <table class="info-table">
                    <tr class="info-row">
                        <td class="info-label">PAYER NAME</td>
                        <td class="info-value">${payerName}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">PAYER ACCOUNT NO</td>
                        <td class="info-value">${payerAccount}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">CREDITED PARTY NAME</td>
                        <td class="info-value">${creditedPartyName}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">CREDITED PARTY ACCOUNT NO</td>
                        <td class="info-value">${creditedPartyAccount}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">TRANSACTION REFERENCE NUMBER</td>
                        <td class="info-value">${transactionRef}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">TRANSACTION TYPE</td>
                        <td class="info-value">${transactionType}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Transaction Detail -->
            <div class="section">
                <div class="section-title">TRANSACTION DETAIL</div>
                <table class="info-table">
                    <tr class="info-row">
                        <td class="info-label">RECEIPT NO</td>
                        <td class="info-value">${receiptNo}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">PAYMENT DATE</td>
                        <td class="info-value">${formattedDate}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">AMOUNT IN FIGURE</td>
                        <td class="info-value">${amount.toFixed(2)}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">SERVICE CHARGE</td>
                        <td class="info-value">${serviceCharge.toFixed(2)}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">VAT</td>
                        <td class="info-value">${vat.toFixed(2)}</td>
                    </tr>
                    <tr class="info-row total-row">
                        <td class="info-label">TOTAL AMOUNT IN FIGURE</td>
                        <td class="info-value">${totalAmount.toFixed(2)}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">PAYMENT MODE</td>
                        <td class="info-value">${paymentMode}</td>
                    </tr>
                    <tr class="info-row">
                        <td class="info-label">PAYMENT REASON</td>
                        <td class="info-value">${paymentReason}</td>
                    </tr>
                </table>
                <div class="amount-in-words">
                    <span class="amount-in-words-label">TOTAL AMOUNT IN WORD</span>
                    <span class="amount-in-words-text">${amountInWords}</span>
                </div>
            </div>
            
            <div class="footer">
                THANK YOU FOR USING ENAT BANK
            </div>
        </div>
    </body>
    </html>
    `;
}

// API Routes

// Generate invoice from database by reference number
app.get('/invoice/:referenceNumber', async (req, res) => {
    try {
        const { referenceNumber } = req.params;
        
        console.log(`🔍 Fetching transaction data for reference: ${referenceNumber}`);
        const transactionData = await getTransactionData(referenceNumber);
        
        if (!transactionData) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
                referenceNumber: referenceNumber
            });
        }
        
        res.json({
            success: true,
            data: transactionData,
            message: 'Transaction data retrieved successfully'
        });
        
    } catch (error) {
        console.error('❌ Error fetching transaction:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate PDF from database by reference number
app.get('/invoice/:referenceNumber/pdf', async (req, res) => {
    try {
        const { referenceNumber } = req.params;
        
        console.log(`📄 Generating PDF for reference: ${referenceNumber}`);
        const transactionData = await getTransactionData(referenceNumber);
        
        if (!transactionData) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found',
                referenceNumber: referenceNumber
            });
        }
        
        const html = generateInvoiceHTML(transactionData, { isPdf: true });
        
        // PDF options - optimized for better quality and rendering
        const options = {
            format: 'A4',
            orientation: 'portrait',
            border: {
                top: '3mm',
                right: '3mm',
                bottom: '3mm',
                left: '3mm'
            },
            type: 'pdf',
            quality: '100',
            timeout: 60000,
            renderDelay: 2000,
            base: `file:///${path.join(__dirname, 'public').replace(/\\/g, '/')}/`
        };
        
        // Generate PDF
        pdf.create(html, options).toBuffer((err, buffer) => {
            if (err) {
                console.error('❌ Error generating PDF:', err.message);
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
            
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice_${referenceNumber}.pdf"`);
            res.setHeader('Content-Length', buffer.length);
            
            res.send(buffer);
        });
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Database connection test
app.get('/db-test', async (req, res) => {
    try {
        const result = await testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate invoice HTML
app.post('/generate-invoice', (req, res) => {
    try {
        const invoiceData = req.body;
        const html = generateInvoiceHTML(invoiceData, { isPdf: true });
        
        res.json({
            success: true,
            html: html,
            message: 'Invoice HTML generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate and download PDF
app.post('/generate-pdf', async (req, res) => {
    try {
        const invoiceData = req.body;
        const html = generateInvoiceHTML(invoiceData);
        
        // PDF options - optimized for better quality and rendering
        const options = {
            format: 'A4',
            orientation: 'portrait',
            border: {
                top: '3mm',
                right: '3mm',
                bottom: '3mm',
                left: '3mm'
            },
            type: 'pdf',
            quality: '100',
            timeout: 60000,
            renderDelay: 2000,
            base: `file:///${path.join(__dirname, 'public').replace(/\\/g, '/')}/`
        };
        
        // Generate PDF
        pdf.create(html, options).toBuffer((err, buffer) => {
            if (err) {
                console.error('❌ Error generating PDF:', err.message);
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
            
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceData.transactionRef || 'invoice'}.pdf"`);
            res.setHeader('Content-Length', buffer.length);
            
            res.send(buffer);
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Preview invoice in browser
app.post('/preview-invoice', (req, res) => {
    try {
        const invoiceData = req.body;
        const html = generateInvoiceHTML(invoiceData);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Convert amount to words API
app.get('/convert-amount/:amount', (req, res) => {
    try {
        const amount = parseFloat(req.params.amount);
        
        if (isNaN(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount provided'
            });
        }
        
        const words = numberToWords(Math.floor(amount)) + " Birr Only";
        
        res.json({
            success: true,
            amount: amount,
            words: words
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Enat Bank Invoice Service',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Root route - serve index.html with injected API_URL
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    const apiUrl = process.env.API_URL || `http://localhost:${port}`;
    
    // Read the HTML file and inject API_URL
    const fs = require('fs');
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Replace the API_BASE placeholder with actual API_URL from env
    html = html.replace('let API_BASE = window.location.origin;', `let API_BASE = '${apiUrl}';`);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Test endpoint with sample data
app.get('/test-invoice', (req, res) => {
    const sampleData = {
        payerName: "Abera Fekede",
        payerAccount: "1234567890123456",
        creditedPartyName: "ETHIOPIAN AIRLINES GROUP",
        creditedPartyAccount: "0011107983540001",
        transactionRef: "001ATAD253180011",
        transactionType: "Fund Transfer",
        receiptNo: "87654321",
        paymentDate: new Date(),
        amount: 10.0000,
        serviceCharge: 2.5000,
        vat: 0.3750,
        paymentMode: "ENAT BANK INTERNET",
        paymentReason: "Airline Ticket Payment"
    };
    
    const html = generateInvoiceHTML(sampleData);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Start server
async function startServer() {
    let dbConnected = false;
    
    try {
        console.log('🚀 Starting Enat Bank Invoice Service...');
        
        // Try to initialize database connection (non-blocking)
        try {
            await initializeDatabase();
            console.log('✅ Database connected - full functionality available');
            dbConnected = true;
        } catch (error) {
            console.log('⚠️  Database connection failed - running in offline mode');
            console.log(`   Error: ${error.message}`);
            console.log('   💡 Service will work with manual data input');
            dbConnected = false;
        }
        
        app.listen(port, () => {
            console.log(`🚀 Enat Bank Invoice Service running at http://localhost:${port}`);
            console.log(`📋 Available endpoints:`);
            
            if (dbConnected) {
                console.log(`   GET  /invoice/:ref           - Get transaction data from DB`);
                console.log(`   GET  /invoice/:ref/pdf       - Generate PDF from DB data`);
                console.log(`   GET  /db-test                - Test database connection`);
            }
            
            console.log(`   POST /generate-invoice       - Generate invoice HTML`);
            console.log(`   POST /generate-pdf           - Generate and download PDF`);
            console.log(`   POST /preview-invoice        - Preview invoice in browser`);
            console.log(`   GET  /convert-amount/:amount - Convert amount to words`);
            console.log(`   GET  /test-invoice           - Test with sample data`);
            console.log(`   GET  /health                 - Health check`);
            console.log(`\n💡 Try: http://localhost:${port}/test-invoice`);
            console.log(`💡 Try: http://localhost:${port}/convert-amount/10`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;