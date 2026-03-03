const sql = require('mssql');
require('dotenv').config();

async function testConnectionMethods() {
    console.log('🧪 Testing Different SQL Server Connection Methods...\n');
    
    const baseConfig = {
        database: process.env.DB_DATABASE || 'ENATMW',
        user: process.env.DB_USER || 'roeb',
        password: process.env.DB_PASSWORD || '',
        options: {
            encrypt: false, // Try without encryption first
            trustServerCertificate: true,
            enableArithAbort: true,
            requestTimeout: 30000,
            connectionTimeout: 30000
        }
    };
    
    const testConfigs = [
        {
            name: 'Method 1: Server with Instance Name',
            config: {
                ...baseConfig,
                server: `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE_NAME}`
            }
        },
        {
            name: 'Method 2: Server with Port',
            config: {
                ...baseConfig,
                server: process.env.DB_SERVER,
                port: parseInt(process.env.DB_PORT) || 1433
            }
        },
        {
            name: 'Method 3: Server with Instance in Options',
            config: {
                ...baseConfig,
                server: process.env.DB_SERVER,
                options: {
                    ...baseConfig.options,
                    instanceName: process.env.DB_INSTANCE_NAME
                }
            }
        },
        {
            name: 'Method 4: Default Port 1433',
            config: {
                ...baseConfig,
                server: process.env.DB_SERVER,
                port: 1433
            }
        }
    ];
    
    for (let i = 0; i < testConfigs.length; i++) {
        const { name, config } = testConfigs[i];
        console.log(`${i + 1}️⃣ ${name}`);
        console.log(`   Connection: ${config.server}${config.port ? ':' + config.port : ''}${config.options?.instanceName ? '\\' + config.options.instanceName : ''}`);
        
        try {
            const pool = await sql.connect(config);
            const result = await pool.request().query('SELECT 1 as test, @@SERVERNAME as server_name, DB_NAME() as database_name');
            
            console.log('   ✅ SUCCESS!');
            console.log(`   Server: ${result.recordset[0].server_name}`);
            console.log(`   Database: ${result.recordset[0].database_name}`);
            
            await pool.close();
            console.log('   🎉 This connection method works!\n');
            return config;
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
        }
    }
    
    console.log('❌ All connection methods failed.');
    console.log('\n🔧 Troubleshooting checklist:');
    console.log('   1. Is SQL Server running?');
    console.log('   2. Is the SQL Server Browser service running? (needed for named instances)');
    console.log('   3. Is TCP/IP enabled in SQL Server Configuration Manager?');
    console.log('   4. Is the firewall blocking port 1433?');
    console.log('   5. Does the user have permission to connect?');
    console.log('   6. Is the password correct in the .env file?');
    
    return null;
}

// Run the test
testConnectionMethods().then((workingConfig) => {
    if (workingConfig) {
        console.log('✅ Found working configuration!');
        console.log('Update your database.js with the successful connection method.');
    }
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
});