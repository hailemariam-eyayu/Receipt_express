const sql = require('mssql');
require('dotenv').config();

async function testPortDiscovery() {
    console.log('🧪 Testing SQL Server port discovery...\n');
    console.log('✅ SSMS works with: EBADCDB01\\ENAT');
    console.log('❌ Node.js fails with named instance');
    console.log('🔍 Trying to find the actual port...\n');
    
    // Common SQL Server ports to try
    const portsToTry = [
        1433,  // Default SQL Server port
        1434,  // SQL Server Browser port
        49152, // Common dynamic port range start
        49153,
        49154,
        49155,
        49156,
        1435,
        1436,
        1437,
        1438,
        1439,
        1440
    ];
    
    for (const port of portsToTry) {
        console.log(`${portsToTry.indexOf(port) + 1}️⃣ Testing port ${port}...`);
        
        try {
            const config = {
                server: 'EBADCDB01',
                port: port,
                database: 'ENATMW',
                user: 'ROEB',
                password: 'E@N@t#135246',
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true,
                    requestTimeout: 10000,
                    connectionTimeout: 10000
                }
            };
            
            console.log(`   🔌 Connecting to EBADCDB01:${port}...`);
            const pool = await sql.connect(config);
            
            console.log('   ✅ Connected successfully!');
            
            // Verify it's the right instance
            const result = await pool.request().query(`
                SELECT 
                    @@SERVERNAME as server_name,
                    @@SERVICENAME as service_name,
                    SERVERPROPERTY('InstanceName') as instance_name,
                    SERVERPROPERTY('ServerName') as full_server_name,
                    DB_NAME() as database_name
            `);
            
            console.log('   📊 Server Details:');
            console.log(`      Server Name: ${result.recordset[0].server_name}`);
            console.log(`      Service Name: ${result.recordset[0].service_name}`);
            console.log(`      Instance Name: ${result.recordset[0].instance_name}`);
            console.log(`      Full Server Name: ${result.recordset[0].full_server_name}`);
            console.log(`      Database: ${result.recordset[0].database_name}`);
            
            // Check if this is the ENAT instance
            if (result.recordset[0].instance_name === 'ENAT' || 
                result.recordset[0].server_name.includes('ENAT') ||
                result.recordset[0].full_server_name.includes('ENAT')) {
                
                console.log('   🎯 This is the ENAT instance!');
                
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
                    console.log('   💰 Transaction data found:');
                    console.log(`      Name: ${record.NAME}`);
                    console.log(`      Account: ${record.AcNo}`);
                    console.log(`      Amount: ${record.Amount}`);
                    console.log(`      Date: ${record.TrnDate}`);
                    console.log(`      Reference: ${record.CustIden}`);
                } else {
                    console.log('   ⚠️  No transaction found for reference 001ATAD253180011');
                }
                
                await pool.close();
                
                console.log(`\n🎉 SUCCESS! Found the working port: ${port}`);
                console.log(`\n📝 Update your .env file:`);
                console.log(`DB_HOST=EBADCDB01`);
                console.log(`DB_PORT=${port}`);
                console.log(`# Remove or comment out DB_INSTANCE=ENAT`);
                
                return { success: true, port: port };
            } else {
                console.log('   ⚠️  This is not the ENAT instance');
                await pool.close();
            }
            
        } catch (error) {
            if (error.message.includes('Login failed')) {
                console.log(`   ❌ Port ${port} - Authentication failed (server reachable but wrong credentials)`);
            } else if (error.message.includes('Failed to connect') || error.message.includes('ECONNREFUSED')) {
                console.log(`   ❌ Port ${port} - Connection refused (no service on this port)`);
            } else {
                console.log(`   ❌ Port ${port} - ${error.message}`);
            }
        }
        
        console.log('');
    }
    
    console.log('❌ Could not find the ENAT instance on any tested port.');
    console.log('\n🔧 Next steps:');
    console.log('1. Check SQL Server Configuration Manager for the actual port');
    console.log('2. Ensure SQL Server Browser service is running');
    console.log('3. Check if TCP/IP protocol is enabled for the ENAT instance');
    console.log('4. Try running this from the same machine where SSMS works');
    
    return { success: false };
}

// Run the test
testPortDiscovery().then((result) => {
    if (result.success) {
        console.log(`\n✅ Found working connection on port ${result.port}!`);
        console.log('Your invoice service database connection is now ready.');
    } else {
        console.log('\n❌ Could not discover the correct port.');
        console.log('Manual configuration may be required.');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Port discovery failed:', error.message);
    process.exit(1);
});