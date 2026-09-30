import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const properties = ['tenantName', 'tenantPhone', 'tenantEmail', 'leaseStartDate', 'leaseEndDate', 'depositHeldZAR', 'annualEscalationPercent'];
const regex = new RegExp(`(?<!leases\\?\\.\\[0\\]\\?\\.)\\b(rental|property|r|u)\\.(${properties.join('|')})`, 'g');

walkDir('src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Replace e.g. rental.tenantName with rental.leases?.[0]?.tenantName
    content = content.replace(regex, '$1.leases?.[0]?.$2');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
  }
});
