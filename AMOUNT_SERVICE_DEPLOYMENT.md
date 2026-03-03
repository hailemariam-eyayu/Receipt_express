# Amount to Words Service - Deployment Guide

## Overview
This Node.js service converts numeric amounts to words (e.g., 10 → "Ten Birr") and can be called from JasperReports or any other application.

## Files Created
- `amount-to-words-service.js` - Main service file
- `package-amount-service.json` - Package dependencies
- `test-service.js` - Test script
- `AMOUNT_SERVICE_DEPLOYMENT.md` - This guide

## Deployment Steps

### 1. Server Setup
```bash
# Create a new directory for the service
mkdir amount-to-words-service
cd amount-to-words-service

# Copy the files
cp amount-to-words-service.js .
cp package-amount-service.json package.json

# Install dependencies
npm install
```

### 2. Start the Service
```bash
# Start the service
npm start

# Or for development with auto-restart
npm run dev
```

The service will run on **http://localhost:3001**

### 3. Test the Service
```bash
# Run the test script
node test-service.js

# Or test manually with curl
curl http://localhost:3001/convert/10
curl http://localhost:3001/test
curl http://localhost:3001/health
```

## API Endpoints

### GET /convert/{amount}
Convert a single amount to words.

**Example:**
```bash
curl http://localhost:3001/convert/10
```

**Response:**
```json
{
  "amount": 10,
  "words": "Ten Birr",
  "success": true
}
```

### POST /convert
Convert amount sent in request body.

**Example:**
```bash
curl -X POST http://localhost:3001/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 1250}'
```

**Response:**
```json
{
  "amount": 1250,
  "words": "One Thousand Two Hundred Fifty Birr",
  "success": true
}
```

### GET /test
Run built-in test cases.

### GET /health
Health check endpoint.

## Using with JasperReports

### Option 1: HTTP Data Source
1. Create a new data source in JasperReports
2. Use HTTP connection to: `http://your-server:3001/convert/10`
3. Parse the JSON response to get the `words` field

### Option 2: Custom Java Function
Create a Java function in JasperReports that calls the service:

```java
public static String convertAmountToWords(BigDecimal amount) {
    try {
        URL url = new URL("http://your-server:3001/convert/" + amount);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        
        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        String response = reader.readLine();
        reader.close();
        
        // Parse JSON and return words field
        // You'll need to add JSON parsing library
        return parseWordsFromJson(response);
    } catch (Exception e) {
        return "Amount: " + amount + " Birr";
    }
}
```

### Option 3: Direct URL Call in Expression
In your JRXML variable expression:
```xml
<variableExpression><![CDATA[
    // This would require custom Java code to make HTTP calls
    // Simpler to use Option 1 or 2
]]></variableExpression>
```

## Production Deployment

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the service with PM2
pm2 start amount-to-words-service.js --name "amount-words-api"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY amount-to-words-service.js .
EXPOSE 3001
CMD ["npm", "start"]
```

### Using systemd (Linux)
Create `/etc/systemd/system/amount-words.service`:
```ini
[Unit]
Description=Amount to Words Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/service
ExecStart=/usr/bin/node amount-to-words-service.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## Test Cases
The service handles these conversions:
- 10 → "Ten Birr"
- 100 → "One Hundred Birr"
- 1250 → "One Thousand Two Hundred Fifty Birr"
- 5000 → "Five Thousand Birr"
- 10000 → "Ten Thousand Birr"

## Error Handling
- Invalid amounts return 400 error
- Service errors return 500 error
- CORS enabled for cross-origin requests

## Next Steps
1. Deploy the service on your server
2. Test with curl or browser
3. Integrate with JasperReports using one of the methods above
4. Update JasperReports to call the service instead of using complex expressions