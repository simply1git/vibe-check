const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'https://vibecheck.vercel.app'; // Default or Argument
const outputPath = path.join(__dirname, '../public/qr-code.png');

console.log(`Generating QR Code for: ${url}`);

QRCode.toFile(outputPath, url, {
  color: {
    dark: '#8b5cf6',  // Violet-500
    light: '#00000000' // Transparent background
  },
  width: 1000,
  margin: 1
}, function (err) {
  if (err) throw err;
  console.log(`✨ QR Code saved to: ${outputPath}`);
});
