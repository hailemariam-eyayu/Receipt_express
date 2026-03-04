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
function generateInvoiceHTML(data) {
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
    const amountInWords = numberToWords(Math.floor(totalAmount)) + " Birr";
    const formattedDate = moment(paymentDate).format('DD/MM/YYYY');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enat Bank Invoice</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Times New Roman', serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: white;
            }
            
            .invoice-container {
                width: 100%;
                max-width: 750px;
                margin: 0 auto;
                padding: 10px;
                background: white;
            }
            
            .header {
                display: flex;
                width: 100%;
                margin-bottom: 10px;
                align-items: flex-start;
            }
            
            .logo-section {
                width: 100px;
                min-width: 100px;
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                text-align: center;
            }
            
            .logo-section img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }
            
            .bank-info {
                flex: 1;
                padding: 0 10px;
            }
            
            .bank-name {
                font-family: 'Bookman Old Style', serif;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
                text-align: center;
            }
            
            .bank-details {
                font-size: 7px;
                font-weight: bold;
                line-height: 1.4;
            }
            
            .bank-detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
            }
            
            .bank-detail-label {
                text-align: left;
            }
            
            .bank-detail-value {
                text-align: right;
            }
            
            .separator {
                border-top: 1px solid #000;
                margin: 10px 0;
            }
            
            .section {
                margin-bottom: 10px;
                border: 1px solid #000;
                padding: 8px;
            }
            
            .section-title {
                text-align: center;
                font-size: 11px;
                font-weight: bold;
                margin-bottom: 8px;
                border-bottom: 1px solid #000;
                padding-bottom: 3px;
            }
            
            .info-row {
                display: table;
                width: 100%;
                margin-bottom: 4px;
                table-layout: fixed;
            }
            
            .info-label {
                display: table-cell;
                font-family: 'Bookman Old Style', serif;
                font-size: 9px;
                font-style: italic;
                width: 35%;
                padding-left: 5px;
                padding-right: 5px;
                vertical-align: top;
            }
            
            .info-value {
                display: table-cell;
                font-family: 'Bookman Old Style', serif;
                font-size: 9px;
                font-style: italic;
                width: 65%;
                padding-left: 5px;
                vertical-align: top;
            }
            
            .transaction-detail .info-label,
            .transaction-detail .info-value {
                font-size: 9px;
            }
            
            .amount-in-words {
                background: #f9f9f9;
                padding: 8px;
                margin: 8px 0;
                border: 1px solid #ddd;
            }
            
            .amount-in-words-label {
                font-family: 'Bookman Old Style', serif;
                font-size: 9px;
                font-weight: bold;
                margin-bottom: 3px;
            }
            
            .amount-in-words-text {
                font-family: 'Bookman Old Style', serif;
                font-size: 9px;
                font-style: italic;
                word-wrap: break-word;
            }
            
            .footer {
                text-align: center;
                margin-top: 15px;
                padding: 8px;
                background: rgba(84, 13, 13, 0.0);
                color: #1599B0;
                font-weight: bold;
                font-style: italic;
                font-size: 10px;
            }
            
            .total-row {
                font-weight: bold;
                border-top: 1px solid #000;
                padding-top: 4px;
                margin-top: 4px;
            }
            
            /* Print-specific styles for PDF generation */
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                }
                .invoice-container {
                    padding: 10px;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="logo-section">
                    <img src="/images/logo.png" alt="Enat Bank Logo" onerror="this.parentElement.innerHTML='LOGO'">
                </div>
                <div class="bank-info">
                    <div class="bank-name">Enat Bank</div>
                    <div class="bank-details">
                        <div class="bank-detail-row">
                            <span class="bank-detail-label">Address:</span>
                            <span class="bank-detail-value">Kirkos Sub-City, Woreda 8, Addis Ababa</span>
                        </div>
                        <div class="bank-detail-row">
                            <span class="bank-detail-label">VAT Reg. Number:</span>
                            <span class="bank-detail-value">6935790003</span>
                        </div>
                        <div class="bank-detail-row">
                            <span class="bank-detail-label">Tin No:</span>
                            <span class="bank-detail-value">0036793983</span>
                        </div>
                        <div class="bank-detail-row">
                            <span class="bank-detail-label">P.O Box:</span>
                            <span class="bank-detail-value">18401</span>
                        </div>
                        <div class="bank-detail-row">
                            <span class="bank-detail-label">Telephone:</span>
                            <span class="bank-detail-value">+251115589416</span>
                        </div>
                        <div class="bank-detail-row">
                            <span class="bank-detail-label">Fax:</span>
                            <span class="bank-detail-value">251115151338</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="separator"></div>
            
            <!-- Transaction Information -->
            <div class="section">
                <div class="section-title">TRANSACTION INFORMATION</div>
                <div class="info-row">
                    <div class="info-label">PAYER NAME</div>
                    <div class="info-value">${payerName}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">PAYER ACCOUNT NO</div>
                    <div class="info-value">${payerAccount}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">CREDITED PARTY NAME</div>
                    <div class="info-value">${creditedPartyName}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">CREDITED PARTY ACCOUNT NO</div>
                    <div class="info-value">${creditedPartyAccount}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">TRANSACTION REFERENCE NUMBER</div>
                    <div class="info-value">${transactionRef}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">TRANSACTION TYPE</div>
                    <div class="info-value">${transactionType}</div>
                </div>
            </div>
            
            <!-- Transaction Detail -->
            <div class="section transaction-detail">
                <div class="section-title">TRANSACTION DETAIL</div>
                <div class="info-row">
                    <div class="info-label">RECEIPT NO</div>
                    <div class="info-value">${receiptNo}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">PAYMENT DATE</div>
                    <div class="info-value">${formattedDate}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">AMOUNT</div>
                    <div class="info-value">${amount.toFixed(4)}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">SERVICE CHARGE</div>
                    <div class="info-value">${serviceCharge.toFixed(4)}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">VAT</div>
                    <div class="info-value">${vat.toFixed(4)}</div>
                </div>
                <div class="info-row total-row">
                    <div class="info-label">TOTAL AMOUNT</div>
                    <div class="info-value">${totalAmount.toFixed(4)}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">PAYMENT MODE</div>
                    <div class="info-value">${paymentMode}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">PAYMENT REASON</div>
                    <div class="info-value">${paymentReason}</div>
                </div>
                
                <div class="amount-in-words">
                    <div class="amount-in-words-label">AMOUNT IN WORDS:</div>
                    <div class="amount-in-words-text">${amountInWords}</div>
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
        
        const html = generateInvoiceHTML(transactionData);
        
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
            renderDelay: 2000
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
        const html = generateInvoiceHTML(invoiceData);
        
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
            renderDelay: 2000
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
        
        const words = numberToWords(Math.floor(amount)) + " Birr";
        
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