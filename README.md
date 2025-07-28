# excel-to-json.mlai

<p align="center">
  <a href="https://www.npmjs.com/package/excel-to-json.mlai">
    <img alt="npm version" src="https://img.shields.io/npm/v/excel-to-json.mlai?style=for-the-badge&color=blue&logo=npm">
  </a>
  <a href="https://github.com/Mathieu-ai/excel-to-json/issues">
    <img alt="Open issues" src="https://img.shields.io/github/issues/Mathieu-ai/excel-to-json?style=for-the-badge&logo=github">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-4.x-blue?style=for-the-badge&logo=typescript">
  </a>
</p>

* 💪 Transform Excel & CSV files into JSON with advanced features
* 📦 Lightweight library with minimal dependencies
* 🌐 Support for Google online Excel files (URLs)
* 📊 Handle multiple sheets with ease
* 📅 Smart date formatting
* ⚡ Async API with streaming support for large files

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
* ✅ **Convert CSV files to JSON** 🆕
* ✅ Support for multiple sheets
* ✅ Fetch and convert online Excel files (including Google Sheets)
* ✅ Customizable date formatting
* ✅ Header transformation
* ✅ Value transformation
* ✅ Skip empty rows/columns
* ✅ Formula support
* ✅ **Nested objects from dot-notation columns** 🆕
* ✅ TypeScript support

## Usage

### Basic Usage

```js
import { excelToJson } from 'excel-to-json.mlai';

// Convert Excel file
const data = await excelToJson('path/to/file.xlsx');
console.log(data);
// Output: [{name: 'John', age: 30}, {name: 'Jane', age: 25}, ...]

// Convert CSV file (automatically detected)
const csvData = await excelToJson('path/to/file.csv');
console.log(csvData);
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

// Google Sheets support
const sheetsData = await excelToJson('https://docs.google.com/spreadsheets/d/your-sheet-id/edit');

// Online CSV files
const csvData = await excelToJson('https://example.com/data.csv');
```

### CSV File Support 🆕

Automatically detects and parses CSV files with customizable options:

```js
// Basic CSV conversion
const data = await excelToJson('data.csv');

// CSV with custom delimiter and options
const data = await excelToJson('data.csv', {
  csvDelimiter: ';',        // Custom delimiter (auto-detected by default)
  csvQuote: '"',           // Quote character
  csvEscape: '"',          // Escape character
  nestedObj: true,         // Create nested objects
  transformValue: (v, h) => {
    // Transform values
    if (h === 'price') return parseFloat(v);
    return v;
  }
});
```

### Nested Objects from Dot-Notation Columns 🆕

Transform flat columns with dot notation into nested objects:

```js
// Excel columns: name, age, hobbies.0, hobbies.1, hobbies.2, address.street, address.city
const data = await excelToJson('file.xlsx', {
  nestedObj: true
});

// Input (flat):
// { name: 'John', 'hobbies.0': 'Reading', 'hobbies.1': 'Gaming', 'address.street': '123 Main St' }

// Output (nested):
// {
//   name: 'John',
//   hobbies: { '0': 'Reading', '1': 'Gaming' },
//   address: { street: '123 Main St' }
// }
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
  sheetSelection: ['Sheet1', 'Sheet2'],   // Specific sheets (or 'all', 'first')
  dateFormatPattern: 'DD/MM/YYYY',       // Date format
  shouldSkipEmptyRows: true,             // Skip empty rows
  shouldSkipEmptyColumns: true,          // Skip empty columns
  hasHeaderRow: true,                    // Use first row as headers
  headerRowIndex: 1,                     // Headers on row 2 (0-based)
  shouldIncludeSheetName: true,          // Add _sheet property to each row
  shouldParseFormulas: true,             // Parse formula results
  shouldCreateNestedObjects: false,      // Create nested objects from dot-notation
  csvParsingOptions: {                   // CSV parsing options
    fieldDelimiter: ',',                 // CSV delimiter (auto-detected)
    quoteCharacter: '"',                 // CSV quote character
    escapeCharacter: '"'                 // CSV escape character
  },
  headerTransformer: (h) => h.trim(),    // Clean headers
  valueTransformer: (v, h) => v          // Process values
});
```

### Modern API

```js
import { excelToJson } from 'excel-to-json.mlai';

// Async processing for all files
const data = await excelToJson('path/to/file.xlsx');
```

## API Reference

### excelToJson(input, options?)

Asynchronously converts Excel or CSV file to JSON.

**Parameters:**

* `input` (string | ArrayBuffer | Buffer): File path, URL, or buffer (supports .xlsx, .xls, .csv)
* `options` (SpreadsheetConversionConfig): Optional configuration

**Returns:** Promise<Record<string, any>[] | Record<string, Record<string, any>[]>>

### SpreadsheetConversionConfig

```typescript
interface SpreadsheetConversionConfig {
  sheetSelection?: 'all' | 'first' | string[] | number[];
  dateFormatPattern?: string;
  shouldSkipEmptyRows?: boolean;
  shouldSkipEmptyColumns?: boolean;
  headerTransformer?: (header: string) => string;
  valueTransformer?: (value: any, header: string) => any;
  hasHeaderRow?: boolean;
  headerRowIndex?: number;
  shouldIncludeSheetName?: boolean;
  shouldParseFormulas?: boolean;
  shouldCreateNestedObjects?: boolean;  // 🆕 Create nested objects from dot-notation
  csvParsingOptions?: CsvParsingConfiguration; // 🆕 CSV parsing options
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

### Example 3: CSV Data Processing

```js
// CSV file with columns: name, age, hobbies.0, hobbies.1, hobbies.2, skills.programming.0
const csvData = await excelToJson('employees.csv', {
  nestedObj: true,
  transformValue: (v, h) => {
    // Convert boolean strings
    if (v === 'TRUE' || v === 'yes') return true;
    if (v === 'FALSE' || v === 'no') return false;
    // Convert numbers
    if (h === 'salary' && !isNaN(Number(v))) return Number(v);
    return v;
  }
});

// Result:
// {
//   name: 'John',
//   age: 25,
//   hobbies: { '0': 'Reading', '1': 'Gaming' },
//   skills: { programming: { '0': 'JavaScript' } },
//   salary: 60000
// }
```

### Example 4: Survey Data with Nested Objects

```js
// Excel columns: name, age, skills.programming.0, skills.programming.1, hobbies.0, hobbies.1
const surveyData = await excelToJson('survey.xlsx', {
  nestedObj: true,
  transformValue: (v, h) => {
    // Convert boolean-like strings
    if (v === 'TRUE' || v === 'yes') return true;
    if (v === 'FALSE' || v === 'no') return false;
    return v;
  }
});

// Result:
// {
//   name: 'John',
//   age: 25,
//   skills: {
//     programming: { '0': 'JavaScript', '1': 'Python' }
//   },
//   hobbies: { '0': 'Reading', '1': 'Gaming' }
// }
```

### Example 5: Multi-Sheet Analysis

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

## What's New in v0.2.6

### 🆕 CSV File Support

Now supports CSV files with automatic detection and parsing:

```js
// Works with both Excel and CSV files
const excelData = await excelToJson('data.xlsx');
const csvData = await excelToJson('data.csv');

// CSV with custom options
const data = await excelToJson('data.csv', {
  csvDelimiter: ';',
  nestedObj: true
});
```

### 🆕 Nested Objects Feature

Transform flat columns with dot notation into nested object structures:

```js
// Excel with columns: name, hobbies.0, hobbies.1, address.street, address.city
const data = await excelToJson('file.xlsx', { shouldCreateNestedObjects: true });

// Before (flat):
{
  name: 'John',
  'hobbies.0': 'Reading',
  'hobbies.1': 'Gaming',
  'address.street': '123 Main St',
  'address.city': 'New York'
}

// After (nested):
{
  name: 'John',
  hobbies: {
    '0': 'Reading',
    '1': 'Gaming'
  },
  address: {
    street: '123 Main St',
    city: 'New York'
  }
}
```

### Enhanced Features

* 📄 **Full CSV file support** with auto-detection
* 🌐 Improved Google Sheets support
* 🔧 Better TypeScript definitions
* ⚡ Performance optimizations
* 🐛 Bug fixes for edge cases

## Migration from v0.x

The new version includes breaking changes:

```js
// Old (v0.x)
import { excelToJson } from 'excel-to-json.mlai';
const data = excelToJson('file.xlsx'); // Synchronous, single sheet

// New (v1.0+)
import { excelToJson } from 'excel-to-json.mlai';
const data = await excelToJson('file.xlsx'); // Async by default
```

## Real-World Examples

### E-commerce Product Catalog

```js
// Excel columns: name, price, variants.size.0, variants.size.1, variants.color.0, variants.color.1
const products = await excelToJson('products.xlsx', {
  nestedObj: true,
  transformValue: (v, h) => {
    if (h === 'price') return parseFloat(v);
    return v;
  }
});

// Result:
// {
//   name: 'T-Shirt',
//   price: 19.99,
//   variants: {
//     size: { '0': 'S', '1': 'M', '2': 'L' },
//     color: { '0': 'Red', '1': 'Blue' }
//   }
// }
```

### CSV Sales Report

```js
// CSV columns: date, product, revenue, cost, region
const salesData = await excelToJson('sales.csv', {
  transformValue: (v, h) => {
    // Parse currency values
    if (h === 'revenue' || h === 'cost') {
      return parseFloat(v.replace(/[$,]/g, ''));
    }
    // Parse dates
    if (h === 'date') {
      return new Date(v);
    }
    return v;
  }
});
```

### User Preferences Survey

```js
// Excel columns: userId, preferences.notifications.email, preferences.notifications.sms, preferences.theme
const userPrefs = await excelToJson('user-preferences.xlsx', {
  nestedObj: true,
  transformValue: (v, h) => {
    // Convert boolean strings
    if (v === 'yes' || v === 'true') return true;
    if (v === 'no' || v === 'false') return false;
    return v;
  }
});

// Result:
// {
//   userId: 'user123',
//   preferences: {
//     notifications: {
//       email: true,
//       sms: false
//     },
//     theme: 'dark'
//   }
// }
```

## Performance Tips

1. **Use specific sheets**: Instead of `sheetSelection: 'all'`, specify only needed sheets
2. **Skip empty data**: Enable `shouldSkipEmptyRows` and `shouldSkipEmptyColumns` for faster processing
3. **Minimize transformations**: Complex transformations can slow down large files
4. **Nested objects**: Use `shouldCreateNestedObjects: true` only when needed, as it adds processing overhead
5. **Streaming for large files**: Enable streaming mode for very large files
6. **Batch processing**: For very large files, consider processing in chunks

## Contributing

All contributions are welcome! Please read our contributing guidelines.

## License

excel-to-json.mlai is [MIT licensed](LICENSE).
