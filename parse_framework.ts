import XLSX from 'xlsx';

const workbook = XLSX.readFile('attached_assets/eval_framework_1761074222896.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
const headers = Object.keys(data[0] || {});

console.log(JSON.stringify({ headers, rows: data }, null, 2));
