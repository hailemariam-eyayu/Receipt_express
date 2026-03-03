// Windows Service Creator for Invoice Service
const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Enat Bank Invoice Service',
  description: 'Professional invoice generation service with PDF export and amount-to-words conversion',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT", 
      value: "3004"
    }
  ]
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function() {
  console.log('✅ Invoice Service installed successfully!');
  console.log('🚀 Starting service...');
  svc.start();
});

svc.on('start', function() {
  console.log('🎉 Invoice Service started successfully!');
  console.log('📋 Service Details:');
  console.log(`   Name: ${svc.name}`);
  console.log(`   Description: ${svc.description}`);
  console.log(`   Script: ${svc.script}`);
  console.log(`   Status: Running`);
  console.log('\n💡 Service is now running as a Windows Service');
  console.log('💡 It will start automatically on system boot');
  console.log('💡 Access at: http://localhost:3004');
});

svc.on('error', function(err) {
  console.error('❌ Service error:', err);
});

// Install the service
console.log('📦 Installing Enat Bank Invoice Service as Windows Service...');
svc.install();