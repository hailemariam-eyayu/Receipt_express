const express = require('express');
const app = express();
const port = 3001;

// Enable JSON parsing
app.use(express.json());

// Enable CORS for all origins
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

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

// API endpoint to convert amount to words
app.get('/convert/:amount', (req, res) => {
    try {
        const amount = parseFloat(req.params.amount);
        
        if (isNaN(amount)) {
            return res.status(400).json({
                error: 'Invalid amount provided',
                amount: req.params.amount
            });
        }
        
        // Convert to integer (ignore decimals for now)
        const intAmount = Math.floor(amount);
        const words = numberToWords(intAmount);
        const result = words + " Birr";
        
        res.json({
            amount: amount,
            words: result,
            success: true
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// POST endpoint for batch conversion
app.post('/convert', (req, res) => {
    try {
        const { amount } = req.body;
        
        if (amount === undefined || amount === null) {
            return res.status(400).json({
                error: 'Amount is required',
                received: req.body
            });
        }
        
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount)) {
            return res.status(400).json({
                error: 'Invalid amount provided',
                amount: amount
            });
        }
        
        const intAmount = Math.floor(numAmount);
        const words = numberToWords(intAmount);
        const result = words + " Birr";
        
        res.json({
            amount: numAmount,
            words: result,
            success: true
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Amount to Words Converter',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint with examples
app.get('/test', (req, res) => {
    const testCases = [
        { amount: 10, expected: "Ten Birr" },
        { amount: 100, expected: "One Hundred Birr" },
        { amount: 1250, expected: "One Thousand Two Hundred Fifty Birr" },
        { amount: 5000, expected: "Five Thousand Birr" },
        { amount: 10000, expected: "Ten Thousand Birr" }
    ];
    
    const results = testCases.map(testCase => {
        const words = numberToWords(testCase.amount) + " Birr";
        return {
            amount: testCase.amount,
            expected: testCase.expected,
            actual: words,
            passed: words === testCase.expected
        };
    });
    
    res.json({
        testResults: results,
        allPassed: results.every(r => r.passed)
    });
});

// Start server
app.listen(port, () => {
    console.log(`Amount to Words service running at http://localhost:${port}`);
    console.log(`Test the service:`);
    console.log(`  GET  /convert/10     - Convert 10 to words`);
    console.log(`  POST /convert        - Convert amount in request body`);
    console.log(`  GET  /test           - Run test cases`);
    console.log(`  GET  /health         - Health check`);
});

module.exports = app;