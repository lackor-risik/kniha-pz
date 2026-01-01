const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../public/Navstevy.xlsx');
const workbook = XLSX.readFile(filePath);

let output = '';
output += 'Sheet names: ' + JSON.stringify(workbook.SheetNames) + '\n\n';

for (const sheetName of workbook.SheetNames) {
    output += `=== Sheet: ${sheetName} ===\n`;
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Show first 5 rows
    output += 'First 5 rows:\n';
    for (let i = 0; i < Math.min(5, data.length); i++) {
        output += `Row ${i}: ${JSON.stringify(data[i])}\n`;
    }
    output += `Total rows: ${data.length}\n\n`;
}

fs.writeFileSync(path.join(__dirname, '../excel-structure.txt'), output);
console.log('Output written to excel-structure.txt');
