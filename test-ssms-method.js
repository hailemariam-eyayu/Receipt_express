const sql = require('mssql');
require('dotenv').config();

async function testSSMSMethod() {
    console.log('🧪 Testing connection based on successful SSMS connection...\n');
    console.log('✅ SSMS Connection: EBADCDB01\\ENAT with user ROEB works');
    console.log('🔍 Testing different Node.js connection variations...\n');
    
    const testConfigs = [
        {
            name: 'Test 1: Direct server\\instance (like SSMS)',
            config: {
                server: 'EBADCDB01\\ENAT',
                database: 'ENATMW',
                user: 'ROEB',
                password: 'E@N@t#135246',
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
            name: 'Test 2: Server with instanceName option',
            config: {
                server: 'EBADCDB01',
                database: 'ENATMW',
                user: 'ROEB',
                password: 'E@N@t#135246',
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    instanceName: 'ENAT',
                    requestTimeout: 30000,
                    connectionTimeout: 30000
                }
            }
        },
        {
            name: 'Test 3: Connection string format',
            connectionString: 'Server=EBADCDB01\\ENAT;Database=ENATMW;User Id=ROEB;Password=E@N@t#135246;Encrypt=false;TrustServerCertificate=true'
        },
        {
            name: 'Test 4: Connection string with port',
            connectionString: 'Server=EBADCDB01\\ENAT,1433;Database=ENATMW;User Id=ROEB;Password=E@N@t#135246;Encrypt=false;TrustServerCertificate=true'
        },
        {
            name: 'Test 5: Try with encryption enabled',
            config: {
                server: 'EBADCDB01\\ENAT',
                database: 'ENATMW',
                user: 'ROEB',
                password: 'E@N@t#135246',
                options: {
                    encrypt: true,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    requestTimeout: 30000,
                    connectionTimeout: 30000
                }
            }
        }
    ];
    
    for (let i = 0; i < testConfigs.length; i++) {
        const { name, config, connectionString } = testConfigs[i];
        console.log(`${i + 1}️⃣ ${name}`);
        
        try {
            console.log('   🔌 Connecting...');
            
            let pool;
            if (connectionString) {
                console.log(`   Connection String: ${connectionString.replace(/Password=[^;]+/, 'Password=***')}`);
                pool = await sql.connect(connectionString);
            } else {
                console.log(`   Server: ${config.server}${config.options?.instanceName ? ' (instance: ' + config.options.instanceName + ')' : ''}`);
                console.log(`   Database: ${config.database}`);
                console.log(`   User: ${config.user}`);
                pool = await sql.connect(config);
            }
            
            console.log('   ✅ Connected successfully!');
            
            // Test basic query
            const result = await pool.request().query(`
                SELECT 
                    @@SERVERNAME as server_name,
                    DB_NAME() as database_name,
                    SYSTEM_USER as current_user,
                    GETDATE() as current_time
            `);
            
            console.log('   📊 Connection Details:');
            console.log(`      Server: ${result.recordset[0].server_name}`);
            console.log(`      Database: ${result.recordset[0].database_name}`);
            console.log(`      User: ${result.recordset[0].current_user}`);
            console.log(`      Time: ${result.recordset[0].current_time}`);
            
            // Test transaction query
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
            }
            
            await pool.close();
            console.log('   🎉 SUCCESS! This method works!\n');
            
            return { success: true, method: name, config, connectionString };
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            
            if (error.message.includes('Login failed')) {
                console.log('   💡 Authentication issue - user/password problem');
            } else if (error.message.includes('Failed to connect')) {
                console.log('   💡 Connection timeout - server/instance name issue');
            } else if (error.message.includes('ECONNRESET')) {
                console.log('   💡 Connection reset - SSL/encryption issue');
            }
            console.log('');
        }
    }
    
    console.log('❌ All connection methods failed.');
    console.log('\n🔧 Additional troubleshooting:');
    console.log('   1. Check if SQL Server Browser service is running');
    console.log('   2. Verify TCP/IP is enabled in SQL Server Configuration Manager');
    console.log('   3. Check Windows Firewall settings');
    console.log('   4. Try connecting from the same machine where SSMS works');
    
    return { success: false };
}

// Run the test
testSSMSMethod().then((result) => {
    if (result.success) {
        console.log('🎉 Found working connection method!');
        console.log('Update your database.js with this configuration.');
        
        if (result.connectionString) {
            console.log('\n📝 Use this connection string:');
            console.log(result.connectionString.replace(/Password=[^;]+/, 'Password=***'));
        } else {
            console.log('\n📝 Use this configuration:');
            console.log(JSON.stringify(result.config, null, 2));
        }
    } else {
        console.log('\n❌ Could not establish Node.js connection.');
        console.log('Even though SSMS works, Node.js connection failed.');
        console.log('This might be a Node.js specific issue or network configuration.');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
});