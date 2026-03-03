const sql = require('mssql');
require('dotenv').config();

async function debugAuthentication() {
    console.log('🔍 Debugging SQL Server Authentication...\n');
    
    console.log('📋 Environment Variables:');
    console.log(`   DB_HOST: "${process.env.DB_HOST}"`);
    console.log(`   DB_PORT: "${process.env.DB_PORT}"`);
    console.log(`   DB_NAME: "${process.env.DB_NAME}"`);
    console.log(`   DB_USER: "${process.env.DB_USER}"`);
    console.log(`   DB_PASSWORD: "${process.env.DB_PASSWORD}"`);
    console.log(`   DB_INSTANCE: "${process.env.DB_INSTANCE}"`);
    console.log(`   Password Length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0} characters\n`);
    
    // Test with different authentication methods
    const testConfigs = [
        {
            name: 'Test 1: Server name with instance',
            config: {
                server: process.env.DB_HOST,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                options: {
                    encrypt: process.env.DB_ENCRYPT === 'true',
                    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
                    enableArithAbort: true,
                    instanceName: process.env.DB_INSTANCE
                }
            }
        },
        {
            name: 'Test 2: Server name with port',
            config: {
                server: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT),
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                options: {
                    encrypt: process.env.DB_ENCRYPT === 'true',
                    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
                    enableArithAbort: true
                }
            }
        },
        {
            name: 'Test 3: Server\\Instance format',
            config: {
                server: `${process.env.DB_HOST}\\${process.env.DB_INSTANCE}`,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true
                }
            }
        }
    ];
    
    for (let i = 0; i < testConfigs.length; i++) {
        const { name, config } = testConfigs[i];
        console.log(`${i + 1}️⃣ ${name}`);
        
        try {
            console.log('   🔌 Attempting connection...');
            const pool = await sql.connect(config);
            
            console.log('   ✅ Connected successfully!');
            
            // Try to get server info
            const result = await pool.request().query(`
                SELECT 
                    @@SERVERNAME as server_name,
                    @@VERSION as version,
                    SYSTEM_USER as current_user,
                    DB_NAME() as current_database
            `);
            
            console.log('   📊 Server Information:');
            console.log(`      Server: ${result.recordset[0].server_name}`);
            console.log(`      User: ${result.recordset[0].current_user}`);
            console.log(`      Database: ${result.recordset[0].current_database}`);
            console.log(`      Version: ${result.recordset[0].version.substring(0, 50)}...`);
            
            // If we connected to master, try to switch to ENATMW
            if (result.recordset[0].current_database !== 'ENATMW') {
                console.log('   🔄 Trying to access ENATMW database...');
                try {
                    await pool.request().query('USE ENATMW');
                    console.log('   ✅ Successfully switched to ENATMW database');
                } catch (useError) {
                    console.log(`   ❌ Cannot access ENATMW: ${useError.message}`);
                }
            }
            
            await pool.close();
            console.log('   🎉 This configuration works!\n');
            return config;
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            
            // Provide specific error analysis
            if (error.message.includes('Login failed')) {
                console.log('   💡 This is an authentication error. Possible causes:');
                console.log('      - Incorrect password');
                console.log('      - User account disabled');
                console.log('      - SQL Server not in mixed authentication mode');
                console.log('      - User not granted login permission');
            } else if (error.message.includes('ECONNRESET')) {
                console.log('   💡 Connection was reset. Possible causes:');
                console.log('      - SSL/TLS configuration mismatch');
                console.log('      - Firewall blocking the connection');
                console.log('      - Server rejecting the connection');
            }
            console.log('');
        }
    }
    
    console.log('❌ All authentication methods failed.');
    console.log('\n🔧 Recommendations:');
    console.log('1. Verify the password is correct by testing in SQL Server Management Studio');
    console.log('2. Check if SQL Server is in Mixed Authentication mode');
    console.log('3. Verify the user "roeb" exists and has login permissions');
    console.log('4. Check if the user has access to the ENATMW database');
    console.log('5. Try connecting with a different user account (like sa)');
    
    return null;
}

// Run the debug
debugAuthentication().then((workingConfig) => {
    if (workingConfig) {
        console.log('🎉 Found working authentication method!');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Debug failed:', error.message);
    process.exit(1);
});