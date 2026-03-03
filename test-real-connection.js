const sql = require('mssql');
require('dotenv').config();

async function testRealConnection() {
    console.log('🧪 Testing Real Database Connection with Your Credentials...\n');
    
    // Test different SSL configurations since DBeaver has certificate issues
    const testConfigs = [
        {
            name: 'Config 1: No Encryption (Recommended for internal networks)',
            config: {
                server: process.env.DB_SERVER,
                port: parseInt(process.env.DB_PORT),
                database: process.env.DB_DATABASE,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    requestTimeout: 30000,
                    connectionTimeout: 30000
                }
            }
        },
        {
            name: 'Config 2: Encryption with Trust Certificate',
            config: {
                server: process.env.DB_SERVER,
                port: parseInt(process.env.DB_PORT),
                database: process.env.DB_DATABASE,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                options: {
                    encrypt: true,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    requestTimeout: 30000,
                    connectionTimeout: 30000
                }
            }
        },
        {
            name: 'Config 3: Instance Name Connection',
            config: {
                server: `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE_NAME}`,
                database: process.env.DB_DATABASE,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    requestTimeout: 30000,
                    connectionTimeout: 30000
                }
            }
        }
    ];
    
    console.log('📋 Using credentials:');
    console.log(`   Server: ${process.env.DB_SERVER}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_DATABASE}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NOT SET'}\n`);
    
    for (let i = 0; i < testConfigs.length; i++) {
        const { name, config } = testConfigs[i];
        console.log(`${i + 1}️⃣ ${name}`);
        
        try {
            console.log('   🔌 Connecting...');
            const pool = await sql.connect(config);
            
            console.log('   ✅ Connected! Testing query...');
            const result = await pool.request().query(`
                SELECT 
                    @@SERVERNAME as server_name,
                    DB_NAME() as database_name,
                    SYSTEM_USER as current_user,
                    GETDATE() as current_time
            `);
            
            console.log('   🎉 SUCCESS!');
            console.log(`   Server: ${result.recordset[0].server_name}`);
            console.log(`   Database: ${result.recordset[0].database_name}`);
            console.log(`   User: ${result.recordset[0].current_user}`);
            console.log(`   Time: ${result.recordset[0].current_time}`);
            
            // Test the actual transaction query
            console.log('   📋 Testing transaction query...');
            const transactionResult = await pool.request()
                .input('Reference_number', sql.VarChar, '001ATAD253180011')
                .query(`
                    SELECT TOP 1
                        i2.NAME, 
                        vil.AcNo,
                        vil.Amount,
                        vil.TrnDate,
                        vil.CustIden
                    FROM vIBTrnLog vil 
                    LEFT JOIN IBUSERMASTER i2 ON i2.USERID = vil.UserId 
                    WHERE vil.CustIden = @Reference_number 
                      AND vil.CrDr = 'DR' 
                      AND vil.Status = '1'
                      AND vil.ModuleType = '170'
                `);
            
            if (transactionResult.recordset.length > 0) {
                const record = transactionResult.recordset[0];
                console.log('   💰 Transaction found:');
                console.log(`      Name: ${record.NAME}`);
                console.log(`      Account: ${record.AcNo}`);
                console.log(`      Amount: ${record.Amount}`);
                console.log(`      Date: ${record.TrnDate}`);
                console.log(`      Reference: ${record.CustIden}`);
            } else {
                console.log('   ⚠️  No transaction found for reference 001ATAD253180011');
                console.log('   💡 Try with a different reference number that exists in your database.');
            }
            
            await pool.close();
            console.log('   🔌 Connection closed successfully\n');
            
            // Update the database.js with working config
            console.log('✅ FOUND WORKING CONFIGURATION!');
            console.log('This configuration will be used in the service.\n');
            return config;
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
        }
    }
    
    console.log('❌ All configurations failed.');
    return null;
}

// Run the test
testRealConnection().then((workingConfig) => {
    if (workingConfig) {
        console.log('🎉 Database connection is working!');
        console.log('You can now start the service with: npm start');
    } else {
        console.log('❌ Could not establish database connection.');
        console.log('Please check your credentials and SQL Server configuration.');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
});