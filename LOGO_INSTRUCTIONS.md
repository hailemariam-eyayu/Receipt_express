# How to Add Enat Bank Logo

## Step 1: Download the Logo

1. Go to: https://commons.wikimedia.org/wiki/File:Enat_Bank.png
2. Click on the image to view full size
3. Right-click and "Save image as..."
4. Save it as `logo.png`

## Step 2: Place the Logo

Copy the `logo.png` file to the `public/images` folder:

```
invoice-service/
  └── public/
      └── images/
          └── logo.png  <-- Place the logo here
```

## Step 3: Restart the Service

```bash
pm2 restart all
```

## Quick Download with PowerShell

Run this command in the `invoice-service` directory:

```powershell
Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/8/8f/Enat_Bank.png" -OutFile "public\images\logo.png"
```

## Alternative: Use Direct URL

If you prefer, you can also download from:
- https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Enat_Bank.png/242px-Enat_Bank.png

The invoice template is already configured to use `/images/logo.png` and will show "LOGO" text as fallback if the image is not found.

## Logo Specifications

- Format: PNG
- Recommended size: 242 × 105 pixels
- Will be automatically resized to fit 100x70px space
- Transparent background recommended

