# excel-to-json.mlai

[![npm version](https://img.shields.io/npm/v/excel-to-json.mlai?color=blue&logo=npm)](https://www.npmjs.com/package/excel-to-json.mlai)
[![Open issues](https://img.shields.io/github/issues/Mathieu-ai/excel-to-json?logo=github)](https://github.com/Mathieu-ai/excel-to-json/issues)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue?logo=typescript)](https://www.typescriptlang.org/)

* 💪 Transform Excel files into JSON with advanced features
* 📦 Lightweight library with minimal dependencies
* 🌐 Support for online Excel files (URLs)
* 📊 Handle multiple sheets with ease
* 📅 Smart date formatting
* 🎯 Tree-shakable imports from generic-functions.mlai v0.8.0
* ⚡ Both async and sync APIs

## Install

```bash
npm i excel-to-json.mlai
```

or

```bash
yarn add excel-to-json.mlai
```

or

```bash
pnpm i excel-to-json.mlai
```

## Features

* ✅ Convert Excel files (.xlsx, .xls) to JSON
* ✅ Support for multiple sheets
* ✅ Fetch and convert online Excel files
* ✅ Customizable date formatting
* ✅ Header transformation
* ✅ Value transformation
* ✅ Skip empty rows/columns
* ✅ Formula support
* ✅ TypeScript support

## Usage

### Basic Usage

```js
import { excelToJson } from 'excel-to-json.mlai';

// Convert local file
const data = await excelToJson('path/to/file.xlsx');
console.log(data);
// Output: [{name: 'John', age: 30}, {name: 'Jane', age: 25}, ...]
```

### Multiple Sheets

```js
// Get all sheets
const allSheets = await excelToJson('file.xlsx', { sheets: 'all' });
console.log(allSheets);
// Output: { Sheet1: [...], Sheet2: [...], Sheet3: [...] }

// Get specific sheets
const specificSheets = await excelToJson('file.xlsx', { 
  sheets: ['Sales', 'Inventory'] 
});
```

### Online Excel Files

```js
// Convert from URL
const onlineData = await excelToJson('https://example.com/data.xlsx');
```

### Custom Date Formatting

```js
const data = await excelToJson('file.xlsx', {
  dateFormat: 'YYYY-MM-DD' // or 'DD/MM/YYYY', 'MM-DD-YYYY', etc.
});
```

### Transform Headers and Values

```js
const data = await excelToJson('file.xlsx', {
  // Transform headers to lowercase with underscores
  transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
  
  // Transform values
  transformValue: (value, header) => {
    if (header === 'price') return parseFloat(value);
    if (header === 'active') return value === 'yes';
    return value;
  }
});
```

### Advanced Options

```js
const data = await excelToJson('file.xlsx', {
  sheets: ['Sheet1', 'Sheet2'],      // Specific sheets
  dateFormat: 'DD/MM/YYYY',          // Date format
  skipEmptyRows: true,               // Skip empty rows
  skipEmptyColumns: true,            // Skip empty columns
  useHeaders: true,                  // Use first row as headers
  headerRow: 2,                      // Headers on row 2 (1-based)
  includeSheetName: true,            // Add _sheet property to each row
  parseFormulas: true,               // Parse formula results
  transformHeader: (h) => h.trim(),  // Clean headers
  transformValue: (v, h) => v        // Process values
});
```

### Synchronous API

```js
import { excelToJsonSync } from 'excel-to-json.mlai';

// For local files only
const data = excelToJsonSync('path/to/file.xlsx');
```

## API Reference

### excelToJson(input, options?)

Asynchronously converts Excel file to JSON.

**Parameters:**
* `input` (string | ArrayBuffer | Buffer): File path, URL, or buffer
* `options` (ExcelToJsonOptions): Optional configuration

**Returns:** Promise<Record<string, any>[] | Record<string, Record<string, any>[]>>

### excelToJsonSync(filePath, options?)

Synchronously converts local Excel file to JSON.

**Parameters:**
* `filePath` (string): Local file path only
* `options` (ExcelToJsonOptions): Optional configuration

**Returns:** Record<string, any>[] | Record<string, Record<string, any>[]>

### ExcelToJsonOptions

```typescript
interface ExcelToJsonOptions {
  sheets?: 'all' | string[] | number[];
  dateFormat?: string;
  skipEmptyRows?: boolean;
  skipEmptyColumns?: boolean;
  transformHeader?: (header: string) => string;
  transformValue?: (value: any, header: string) => any;
  useHeaders?: boolean;
  headerRow?: number;
  includeSheetName?: boolean;
  parseFormulas?: boolean;
}
```

## Examples

### Example 1: Sales Report

```js
const salesData = await excelToJson('sales-2024.xlsx', {
  sheets: ['Q1', 'Q2', 'Q3', 'Q4'],
  dateFormat: 'MM/DD/YYYY',
  transformHeader: (h) => h.toLowerCase().replace(/\s+/g, '_'),
  transformValue: (v, h) => {
    if (h === 'revenue' || h === 'cost') {
      return parseFloat(v.replace(/[$,]/g, ''));
    }
    return v;
  }
});
```

### Example 2: Employee Database

```js
const employees = await excelToJson('https://hr.company.com/employees.xlsx', {
  skipEmptyRows: true,
  transformValue: (v, h) => {
    if (h === 'Email') return v.toLowerCase();
    if (h === 'Active') return v === 'Yes';
    if (h === 'Salary') return parseFloat(v);
    return v;
  }
});
```

### Example 3: Multi-Sheet Analysis

```js
const analysis = await excelToJson('data.xlsx', {
  sheets: 'all',
  includeSheetName: true,
  dateFormat: 'YYYY-MM-DD'
});

// Process each sheet
for (const [sheetName, data] of Object.entries(analysis)) {
  console.log(`Processing ${sheetName}: ${data.length} rows`);
}
```

## Migration from v0.x

The new version includes breaking changes:

```js
// Old (v0.x)
import { excelToJson } from 'excel-to-json.mlai';
const data = excelToJson('file.xlsx'); // Synchronous, single sheet

// New (v1.0+)
import { excelToJson } from 'excel-to-json.mlai';
const data = await excelToJson('file.xlsx'); // Async by default

// Or use sync version
import { excelToJsonSync } from 'excel-to-json.mlai';
const data = excelToJsonSync('file.xlsx');
```

## Performance Tips

1. **Use specific sheets**: Instead of `sheets: 'all'`, specify only needed sheets
2. **Skip empty data**: Enable `skipEmptyRows` and `skipEmptyColumns`
3. **Minimize transformations**: Complex transformations can slow down large files
4. **Use sync API carefully**: Only for small local files in non-blocking contexts

## Contributing

All contributions are welcome! Please read our contributing guidelines.

## License

excel-to-json.mlai is [MIT licensed](LICENSE).
