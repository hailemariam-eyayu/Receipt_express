# Database Setup Guide

## 🎯 Current Status

✅ **Server is reachable** - Connection to `10.1.12.217:1433` is working  
❌ **Authentication failed** - Need to set correct password for user `roeb`

## 🔧 Quick Fix

### 1. Update Password in .env file

Edit `invoice-service/.env` and set the correct password:

```env
# Database Configuration
DB_SERVER=10.1.12.217
DB_PORT=1433
DB_DATABASE=ENATMW
DB_USER=roeb
DB_PASSWORD=your_actual_password_here  # ← UPDATE THIS
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=3003
NODE_ENV=development
```

### 2. Test the Connection

```bash
npm run test-connection
```

**Expected Result:**
```
✅ SUCCESS!
Server: YOUR_SERVER_NAME
Database: ENATMW
🎉 This connection method works!
```

### 3. Start the Service

```bash
npm start
```

**Expected Result:**
```
🚀 Starting Enat Bank Invoice Service...
🔌 Connecting to SQL Server: 10.1.12.217:1433 Database: ENATMW User: roeb
✅ Database connected successfully
🚀 Enat Bank Invoice Service running at http://localhost:3003
```

## 🧪 Test Real Data

Once connected, test with your actual transaction reference:

```bash
# Get transaction data
curl http://localhost:3003/invoice/001ATAD253180011

# Generate PDF
curl http://localhost:3003/invoice/001ATAD253180011/pdf --output invoice.pdf
```

## 🔍 Connection Test Results

From our testing, we found:

| Method | Server | Status | Issue |
|--------|--------|--------|-------|
| Instance Name | `10.1.12.217\ENAT` | ❌ Timeout | SQL Browser service issue |
| **Port 1433** | `10.1.12.217:1433` | ✅ **WORKS** | Just needs password |

**Recommendation:** Use port-based connection (already configured)

## 🛠️ Troubleshooting

### If you still get "Login failed":

1. **Check password** - Make sure it's correct in `.env`
2. **Check user permissions** - User `roeb` needs access to `ENATMW` database
3. **Check SQL Server authentication** - Ensure mixed mode authentication is enabled

### If you get connection timeout:

1. **Check firewall** - Port 1433 should be open
2. **Check SQL Server** - Should be running and accepting connections
3. **Check network** - Server should be reachable from your machine

### SQL Server Configuration Check:

```sql
-- Run these queries on SQL Server to verify:

-- 1. Check if user exists
SELECT name FROM sys.sql_logins WHERE name = 'roeb'

-- 2. Check database access
SELECT 
    dp.name AS principal_name,
    dp.type_desc AS principal_type,
    r.name AS role_name
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members rm ON dp.principal_id = rm.member_principal_id
LEFT JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'roeb'

-- 3. Check if tables exist
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('vIBTrnLog', 'IBTRNTYPE', 'IBUSERMASTER')
```

## 🎉 Next Steps

Once the database connection is working:

1. **Test transaction queries** with real reference numbers
2. **Generate actual PDFs** from your database
3. **Deploy to production** server
4. **Integrate with your applications**

The service is ready - just needs the correct password! 🔑