// Test if the working project can actually connect to the database
const sql = require('mssql');
require('dotenv').config({ path: '../DB Connection Real Time Analysis/.env' });

async function testWorkingProjectConnection() {
    console.log('🧪 Testing if working project can actually connect to database...\n');
    
    // Use exact same method as working project
    const rawServer = process.env.DB_HOST || "";
    const hasInstance = rawServer.includes("\\");
    const serverName = hasInstance ? rawServer.split("\\")[0] : rawServer;
    const instanceNameEnv = process.env.DB_INSTANCE;
    const instanceName = instanceNameEnv ?? (hasInstance ? rawServer.split("\\")[1] : undefined);
    const port = Number(process.env.DB_PORT || "1433");
    const encrypt = (process.env.DB_ENCRYPT ?? "true").toLowerCase() === "true";
    const trustCert = (process.env.DB_TRUST_CERT ?? "true").toLowerCase() === "true";
    
    console.log('📋 Working Project Configuration:');
    console.log(`   DB_HOST: "${process.env.DB_HOST}"`);
    console.log(`   DB_USER: "${process.env.DB_USER}"`);
    console.log(`   DB_NAME: "${process.env.DB_NAME}"`);
    console.log(`   DB_INSTANCE: "${process.env.DB_INSTANCE}"`);
    console.log(`   DB_ENCRYPT: "${process.env.DB_ENCRYPT}"`);
    console.log(`   DB_TRUST_CERT: "${process.env.DB_TRUST_CERT}"`);
    console.log(`   Parsed Server: "${serverName}"`);
    console.log(`   Parsed Instance: "${instanceName}"`);
    console.log(`   Port: ${port}`);
    console.log(`   Encrypt: ${encrypt}`);
    console.log(`   Trust Cert: ${trustCert}\n`);
    
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
        console.log('🔌 Testing connection...');
        const pool = await sql.connect(connectionString);
        
        console.log('✅ Connected successfully!');
        
        const result = await pool.request().query('SELECT @@SERVERNAME as server, DB_NAME() as database, GETDATE() as time');
        console.log('📊 Database Info:');
        console.log(`   Server: ${result.recordset[0].server}`);
        console.log(`   Database: ${result.recordset[0].database}`);
        console.log(`   Time: ${result.recordset[0].time}`);
        
        await pool.close();
        console.log('\n🎉 The working project CAN connect to the database!');
        console.log('This means the credentials and server are correct.');
        
        return true;
        
    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        console.log('\n💡 This means the working project also cannot connect.');
        console.log('The issue might be:');
        console.log('   - SQL Server is not running');
        console.log('   - Network connectivity issues');
        console.log('   - Server name has changed');
        
        return false;
    }
}

testWorkingProjectConnection().then((success) => {
    if (success) {
        console.log('\n✅ Working project connects successfully!');
        console.log('Your invoice service should work with the same configuration.');
    } else {
        console.log('\n❌ Even the working project cannot connect.');
        console.log('Please check SQL Server status and network connectivity.');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
});