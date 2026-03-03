const http = require('http');
const fs = require('fs');

// Test data matching your original invoice
const testInvoiceData = {
    payerName: "Test User",
    payerAccount: "1234567890123456",
    creditedPartyName: "ETHIOPIAN AIRLINES GROUP",
    creditedPartyAccount: "0011107983540001",
    transactionRef: "001ATAD253180011",
    transactionType: "Fund Transfer",
    receiptNo: "12345678",
    paymentDate: new Date(),
    amount: 10.0000,
    serviceCharge: 0.0000,
    vat: 0.0000,
    paymentMode: "ENAT BANK INTERNET",
    paymentReason: "Service Payment"
};

function testService() {
    console.log('🧪 Testing Enat Bank Invoice Service...\n');
    
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    makeRequest('GET', '/health', null, (response) => {
        console.log(`   Status: ${response.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Service: ${response.service}\n`);
        
        // Test 2: Amount to Words
        console.log('2️⃣ Testing amount to words conversion...');
        makeRequest('GET', '/convert-amount/10', null, (response) => {
            console.log(`   Amount: ${response.amount}`);
            console.log(`   Words: ${response.words}`);
            console.log(`   Status: ${response.words === 'Ten Birr' ? '✅ PASSED' : '❌ FAILED'}\n`);
            
            // Test 3: Generate Invoice HTML
            console.log('3️⃣ Testing invoice HTML generation...');
            makeRequest('POST', '/generate-invoice', testInvoiceData, (response) => {
                console.log(`   HTML Generated: ${response.html ? 'Yes' : 'No'}`);
                console.log(`   Status: ${response.success ? '✅ PASSED' : '❌ FAILED'}\n`);
                
                // Test 4: Generate PDF (this will save the PDF to file)
                console.log('4️⃣ Testing PDF generation...');
                generatePDF();
            });
        });
    });
}

function makeRequest(method, path, data, callback) {
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(responseData);
                callback(response);
            } catch (error) {
                console.log(`   ❌ FAILED - Invalid JSON response: ${error.message}`);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`   ❌ FAILED - Connection error: ${error.message}`);
    });
    
    if (data) {
        req.write(JSON.stringify(data));
    }
    
    req.end();
}

function generatePDF() {
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/generate-pdf',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            const writeStream = fs.createWriteStream('test-invoice.pdf');
            res.pipe(writeStream);
            
            writeStream.on('finish', () => {
                console.log(`   PDF Generated: test-invoice.pdf`);
                console.log(`   File Size: ${fs.statSync('test-invoice.pdf').size} bytes`);
                console.log(`   Status: ✅ PASSED\n`);
                
                console.log('🎉 All tests completed!');
                console.log('📄 Check test-invoice.pdf to see the generated invoice.');
            });
        } else {
            console.log(`   ❌ FAILED - HTTP ${res.statusCode}`);
        }
    });
    
    req.on('error', (error) => {
        console.log(`   ❌ FAILED - Connection error: ${error.message}`);
    });
    
    req.write(JSON.stringify(testInvoiceData));
    req.end();
}

// Wait for service to start, then run tests
setTimeout(testService, 2000);