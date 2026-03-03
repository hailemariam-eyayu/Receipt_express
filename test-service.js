// Test script for the amount-to-words service
const http = require('http');

function testService() {
    console.log('Testing Amount to Words Service...\n');
    
    // Test cases
    const testCases = [
        { amount: 10, expected: "Ten Birr" },
        { amount: 100, expected: "One Hundred Birr" },
        { amount: 1250, expected: "One Thousand Two Hundred Fifty Birr" },
        { amount: 5000, expected: "Five Thousand Birr" },
        { amount: 10000, expected: "Ten Thousand Birr" }
    ];
    
    let completedTests = 0;
    const totalTests = testCases.length;
    
    testCases.forEach((testCase, index) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/convert/${testCase.amount}`,
            method: 'GET'
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    const passed = response.words === testCase.expected;
                    
                    console.log(`Test ${index + 1}: Amount ${testCase.amount}`);
                    console.log(`  Expected: ${testCase.expected}`);
                    console.log(`  Actual:   ${response.words}`);
                    console.log(`  Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
                    
                    completedTests++;
                    if (completedTests === totalTests) {
                        console.log('All tests completed!');
                    }
                } catch (error) {
                    console.log(`Test ${index + 1}: ❌ FAILED - Invalid JSON response`);
                    console.log(`  Error: ${error.message}\n`);
                    
                    completedTests++;
                    if (completedTests === totalTests) {
                        console.log('All tests completed!');
                    }
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`Test ${index + 1}: ❌ FAILED - Connection error`);
            console.log(`  Error: ${error.message}\n`);
            
            completedTests++;
            if (completedTests === totalTests) {
                console.log('All tests completed!');
            }
        });
        
        req.end();
    });
}

// Wait a moment for the service to start, then run tests
setTimeout(testService, 1000);