const { testConnection, getTransactionData } = require('./database');
require('dotenv').config();

async function testDatabaseConnection() {
    console.log('🧪 Testing Database Connection...\n');
    
    // Display configuration (without password)
    console.log('📋 Database Configuration:');
    console.log(`   Server: ${process.env.DB_SERVER}`);
    console.log(`   Instance: ${process.env.DB_INSTANCE_NAME}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_DATABASE}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`);
    console.log(`   Encrypt: ${process.env.DB_ENCRYPT}`);
    console.log(`   Trust Certificate: ${process.env.DB_TRUST_SERVER_CERTIFICATE}\n`);
    
    // Test basic connection
    console.log('1️⃣ Testing basic database connection...');
    try {
        const result = await testConnection();
        if (result.success) {
            console.log('   ✅ Database connection successful!\n');
            
            // Test transaction query
            console.log('2️⃣ Testing transaction data query...');
            try {
                const transactionData = await getTransactionData('001ATAD253180011');
                if (transactionData) {
                    console.log('   ✅ Transaction data found:');
                    console.log(`      Payer: ${transactionData.payerName}`);
                    console.log(`      Amount: ${transactionData.amount}`);
                    console.log(`      Reference: ${transactionData.transactionRef}`);
                    console.log(`      Date: ${transactionData.paymentDate}\n`);
                    
                    console.log('🎉 All tests passed! Database is ready for use.');
                } else {
                    console.log('   ⚠️  No transaction found for reference 001ATAD253180011');
                    console.log('   💡 Try with a different reference number that exists in your database.\n');
                }
            } catch (error) {
                console.log(`   ❌ Transaction query failed: ${error.message}\n`);
            }
            
        } else {
            console.log(`   ❌ Database connection failed: ${result.message}\n`);
        }
    } catch (error) {
        console.log(`   ❌ Connection test failed: ${error.message}\n`);
        
        // Provide troubleshooting tips
        console.log('🔧 Troubleshooting Tips:');
        console.log('   1. Check if SQL Server is running');
        console.log('   2. Verify server IP and instance name');
        console.log('   3. Ensure user has database access permissions');
        console.log('   4. Check if SQL Server allows remote connections');
        console.log('   5. Verify firewall settings for port 1433');
        console.log('   6. Update DB_PASSWORD in .env file\n');
    }
}

// Run the test
testDatabaseConnection().then(() => {
    console.log('Test completed.');
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
});