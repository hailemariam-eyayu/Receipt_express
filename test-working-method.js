const sql = require('mssql');
require('dotenv').config();

// Use EXACT same method as working "DB Connection Real Time Analysis" project
async function testWorkingMethod() {
    console.log('🧪 Testing with EXACT method from working project...\n');
    
    // Parse server and instance exactly like working project
    const rawServer = process.env.DB_HOST || "";
    const hasInstance = rawServer.includes("\\");
    const serverName = hasInstance ? rawServer.split("\\")[0] : rawServer;
    const instanceNameEnv = process.env.DB_INSTANCE;
    const instanceName = instanceNameEnv ?? (hasInstance ? rawServer.split("\\")[1] : undefined);
    const port = Number(process.env.DB_PORT || "1433");
    const encrypt = (process.env.DB_ENCRYPT ?? "true").toLowerCase() === "true";
    const trustCert = (process.env.DB_TRUST_CERT ?? "true").toLowerCase() === "true";
    
    console.log('📋 Parsed Configuration:');
    console.log(`   Raw Server: "${rawServer}"`);
    console.log(`   Has Instance: ${hasInstance}`);
    console.log(`   Server Name: "${serverName}"`);
    console.log(`   Instance Name: "${instanceName}"`);
    console.log(`   Port: ${port}`);
    console.log(`   Encrypt: ${encrypt}`);
    console.log(`   Trust Cert: ${trustCert}\n`);
    
    // Build connection string exactly like working project
    function buildConnectionString() {
        const serverPart = instanceName
            ? `${serverName}\\${instanceName},${port}`
            : `${serverName},${port}`;
        const enc = encrypt ? "true" : "false";
        const trust = trustCert ? "true" : "false";
        const user = process.env.DB_USER || "";
        const pwd = process.env.DB_PASSWORD || "";
        const db = process.env.DB_NAME || "";
        
        return `Server=${serverPart};Database=${db};User Id=${user};Password=${pwd};Encrypt=${enc};TrustServerCertificate=${trust}`;
    }
    
    const connectionString = buildConnectionString();
    console.log('🔗 Connection String:');
    console.log(`   ${connectionString.replace(/Password=[^;]+/, 'Password=***')}\n`);
    
    try {
        console.log('🔌 Connecting with working project method...');
        const pool = await sql.connect(connectionString);
        
        console.log('✅ Connected successfully!');
        
        // Test basic query
        const result = await pool.request().query('SELECT @@SERVERNAME as server_name, DB_NAME() as database_name, SYSTEM_USER as current_user');
        
        console.log('📊 Connection Details:');
        console.log(`   Server: ${result.recordset[0].server_name}`);
        console.log(`   Database: ${result.recordset[0].database_name}`);
        console.log(`   User: ${result.recordset[0].current_user}`);
        
        // Test the transaction query
        console.log('\n📋 Testing transaction query...');
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
            console.log('💰 Transaction found:');
            console.log(`   Name: ${record.NAME}`);
            console.log(`   Account: ${record.AcNo}`);
            console.log(`   Amount: ${record.Amount}`);
            console.log(`   Date: ${record.TrnDate}`);
            console.log(`   Reference: ${record.CustIden}`);
        } else {
            console.log('⚠️  No transaction found for reference 001ATAD253180011');
        }
        
        await pool.close();
        console.log('\n🎉 SUCCESS! This method works perfectly!');
        return true;
        
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        
        if (error.message.includes('Login failed')) {
            console.log('\n💡 Authentication Error Analysis:');
            console.log('   - Password might be incorrect');
            console.log('   - User might not exist or be disabled');
            console.log('   - SQL Server might not be in mixed authentication mode');
        } else if (error.message.includes('Failed to connect')) {
            console.log('\n💡 Connection Error Analysis:');
            console.log('   - Server/instance name might be incorrect');
            console.log('   - SQL Server Browser service might not be running');
            console.log('   - Network connectivity issues');
        } else if (error.message.includes('ECONNRESET')) {
            console.log('\n💡 SSL/TLS Error Analysis:');
            console.log('   - Try with Encrypt=false');
            console.log('   - Certificate trust issues');
        }
        
        return false;
    }
}

// Run the test
testWorkingMethod().then((success) => {
    if (success) {
        console.log('\n✅ The working project method is successful!');
        console.log('Your invoice service database connection is now ready.');
    } else {
        console.log('\n❌ Connection failed with working project method.');
        console.log('Please check your credentials and SQL Server configuration.');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
});