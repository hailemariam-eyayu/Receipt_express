const sql = require('mssql');
require('dotenv').config();

// Parse server and instance from environment variables (same as working project)
const rawServer = process.env.DB_HOST || "";
const hasInstance = rawServer.includes("\\");
const serverName = hasInstance ? rawServer.split("\\")[0] : rawServer;
const instanceNameEnv = process.env.DB_INSTANCE;
const instanceName = instanceNameEnv ?? (hasInstance ? rawServer.split("\\")[1] : undefined);
const port = Number(process.env.DB_PORT || "1433");
const encrypt = (process.env.DB_ENCRYPT ?? "true").toLowerCase() === "true";
const trustCert = (process.env.DB_TRUST_CERT ?? "true").toLowerCase() === "true";

// Build connection string exactly like the working project
function buildConnectionString() {
    const serverPart = instanceName
        ? `${serverName}\\${instanceName},${port}`
        : `${serverName},${port}`;
    const enc = encrypt ? "true" : "false";
    const trust = trustCert ? "true" : "false";
    const user = process.env.DB_USER || "";
    const pwd = process.env.DB_PASSWORD || "";
    const db = process.env.DB_NAME || "";
    
    const connectionString = `Server=${serverPart};Database=${db};User Id=${user};Password=${pwd};Encrypt=${enc};TrustServerCertificate=${trust}`;
    console.log(`🔌 Connection String: Server=${serverPart};Database=${db};User Id=${user};Password=***;Encrypt=${enc};TrustServerCertificate=${trust}`);
    
    return connectionString;
}

let pool = null;

// Initialize database connection (using connection string like working project)
async function initializeDatabase() {
    try {
        if (pool) {
            return pool;
        }
        
        console.log('🔌 Connecting to database...');
        const connectionString = buildConnectionString();
        
        // Set a shorter timeout for startup
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database connection timeout (10s)')), 10000);
        });
        
        const connectPromise = sql.connect(connectionString);
        
        pool = await Promise.race([connectPromise, timeoutPromise]);
        console.log('✅ Database connected successfully');
        
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

// Get transaction data by reference number
async function getTransactionData(referenceNumber) {
    try {
        if (!pool) {
            await initializeDatabase();
        }
        
        const request = pool.request();
        request.input('Reference_number', sql.VarChar, referenceNumber);
        
        const query = `
SELECT DISTINCT 
    i2.NAME, 
    CASE 
        WHEN vil.branchcode = 9901 THEN act.MOBILENUMBER
        ELSE vil.AcNo
    END AS AcNo,
    CASE 
        WHEN vil.ModuleType in (152,163,153,162,164,165) THEN CAST(vil.Utility AS VARCHAR(50))
        ELSE CAST(vil_cr.AcNo AS VARCHAR(50))
    END AS CreditedAccount,
    CASE 
        WHEN vil.ModuleType = 170 THEN 'ETHIOPIAN AIRLINES GROUP'
        WHEN vil.ModuleType in (152,163,153,162,164,165) THEN vil.ThirdPartyName  
        when vil.ModuleType = 168 then ut.EntName
        ELSE i3.name
    END AS CreditAccountName,
    vil.CustIden, 
  case 
     when vil.ModuleType = 148 then 'Account to Account/Wallet'
	   else i.DESCR
	    end as Description,
	    
	CASE 
        WHEN vil.ModuleType in (152,163,153,162,164,165) THEN CAST(vil.UtilRefNo AS VARCHAR(50))
        ELSE CAST(vil_cr.TScrollId AS VARCHAR(50))
    END AS "Receipt No",
    vil.TrnDate, 
    vil.Amount, 
    vil.ComAmount, 
    vil.ExchgAmount,
    ISNULL(vil.Amount, 0) + ISNULL(vil.ComAmount, 0) + ISNULL(vil.ExchgAmount, 0) AS Total_amount,
    'ENAT BANK ' + ISNULL(vil.Channel, 'INTERNET') AS PaymentMode, 
    vil.Particulars,
    CAST(ISNULL(vil.Amount, 0) AS VARCHAR(20)) AS AmountString
FROM vIBTrnLog vil 
INNER JOIN vIBTrnLog vil_cr 
    ON vil.TScrollId = vil_cr.TScrollId 
    AND vil_cr.CrDr = 'CR'
LEFT JOIN IBTRNTYPE i 
    ON vil.ModuleType = i.CODE 
LEFT JOIN IBUSERMASTER i2 
    ON i2.USERID = vil.UserId
LEFT JOIN IBUSERMASTER i3 
    ON CAST(SUBSTRING(vil_cr.acno, 5, 7) AS VARCHAR(50)) = CAST(i3.custid AS VARCHAR(50))
    left join UnicashTrn ut on ut.IBTrnScrollId = vil.TScrollId
OUTER APPLY (
    SELECT TOP 1 MOBILENUMBER 
    FROM IBUSERACTIVATIONENTRY 
    WHERE i2.CUSTID = custno 
      AND ENTRYDATE <= vil.TrnDate 
    ORDER BY ENTRYDATE DESC
) act
WHERE vil.CustIden = @Reference_number
  AND vil.CrDr = 'DR' 
  AND vil.Status = '1'
        `;
        
        const result = await request.query(query);
        
        if (result.recordset.length === 0) {
            return null;
        }
        
        const record = result.recordset[0];
        
        // Transform database result to invoice format
        return {
            payerName: record.NAME || '',
            payerAccount: record.AcNo || '',
            creditedPartyName: record.CreditAccountName || '',
            creditedPartyAccount: record.CreditedAccount || '',
            transactionRef: record.CustIden || referenceNumber,
            transactionType: record.DESCR || '',
            receiptNo: record["Receipt No"] || '',
            paymentDate: record.TrnDate || new Date(),
            amount: parseFloat(record.Amount) || 0,
            serviceCharge: parseFloat(record.ComAmount) || 0,
            vat: parseFloat(record.ExchgAmount) || 0,
            totalAmount: parseFloat(record.Total_amount) || 0,
            paymentMode: record.PaymentMode || '',
            paymentReason: record.Particulars || ''
        };
        
    } catch (error) {
        console.error('❌ Database query failed:', error.message);
        throw error;
    }
}

// Test database connection (same as working project)
async function testConnection() {
    try {
        await initializeDatabase();
        const result = await pool.request().query('SELECT 1 as test');
        return { success: true, message: 'Database connection successful' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Close database connection
async function closeConnection() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('🔌 Database connection closed');
        }
    } catch (error) {
        console.error('❌ Error closing database connection:', error.message);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

module.exports = {
    initializeDatabase,
    getTransactionData,
    testConnection,
    closeConnection
};