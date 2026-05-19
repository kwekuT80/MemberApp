/**
 * Temporary xlsx inspector script
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const xlsxPath = path.join(__dirname, '..', 'KSJI_500_Attendance_Matrix_Final_Reconciled.xlsx');
  
  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    return;
  }

  console.log(`Checking/installing xlsx library...`);
  try {
    require('xlsx');
  } catch (e) {
    console.log(`Installing 'xlsx' package via npm...`);
    execSync('npm install --no-save xlsx', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  }

  const XLSX = require('xlsx');
  console.log(`Loading workbook: ${xlsxPath}`);
  const workbook = XLSX.readFile(xlsxPath);
  
  console.log(`Sheet Names found:`, workbook.SheetNames);
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  console.log(`\n--- Reading First Sheet: "${firstSheetName}" ---`);
  
  // Convert worksheet to JSON (header: 1 returns array of arrays)
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Total rows read: ${rows.length}`);
  
  console.log(`\n=== ALL COLUMNS IN ROW 1 ===`);
  console.log(JSON.stringify(rows[0]));
  
  console.log(`\n=== FIRST 15 ROWS ===`);
  const previewRows = rows.slice(0, 15);
  previewRows.forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row)); 
  });
}

main().catch(err => {
  console.error(err);
});
