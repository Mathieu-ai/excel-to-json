import * as XLSX from 'xlsx';
import {
    ExcelToJsonOptions,
    ExcelInput,
    ExcelToJsonResult,
    MultiSheetResult
} from '../types';
import {
    defaultHeaderTransform,
    formatDate,
    prepareInput,
    getTargetSheets,
    cleanData
} from './utils';

/**
 * Convert a single worksheet to JSON.
 * @param worksheet - XLSX worksheet object
 * @param sheetName - Name of the sheet
 * @param options - Conversion options
 * @returns Array of row objects
 */
const convertWorksheet = (
    worksheet: XLSX.WorkSheet,
    sheetName: string,
    options: Required<ExcelToJsonOptions>
): Record<string, any>[] => {
    const data: Record<string, any>[] = [];
    const headers: Record<string, string> = {};

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

    // Extract headers
    if (options.useHeaders) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: options.headerRow - 1, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
                const headerValue = options.transformHeader(String(cell.v));
                if (headerValue) headers[XLSX.utils.encode_col(col)] = headerValue;
            }
        }
    }

    // Extract data rows
    const startRow = options.useHeaders ? options.headerRow : 0;
    for (let row = startRow; row <= range.e.r; row++) {
        const rowData: Record<string, any> = {};
        let hasData = false;

        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            const colName = XLSX.utils.encode_col(col);

            const columnKey = options.useHeaders && headers[colName] ? headers[colName] : colName;
            let value: any = null;

            if (cell) {
                value = options.parseFormulas && cell.f ? cell.v : cell.v;

                // Format dates
                if (cell.t === 'd' || (cell.t === 'n' && XLSX.SSF.is_date(cell.z || ''))) {
                    if (value instanceof Date) value = formatDate(value, options.dateFormat);
                }

                // Format booleans
                if (cell.t === 'b') value = Boolean(value);

                value = options.transformValue(value, columnKey);

                if (value !== null && value !== undefined && value !== '') hasData = true;
            }

            rowData[columnKey] = value;
        }

        if (hasData || !options.skipEmptyRows) {
            if (options.includeSheetName) rowData._sheet = sheetName;
            data.push(rowData);
        }
    }

    return cleanData(data, options.skipEmptyRows, options.skipEmptyColumns);
};

/**
 * Internal conversion function for both sync and async.
 * @param input - File path or ArrayBuffer
 * @param options - Conversion options
 * @returns ExcelToJsonResult
 */
const convertInternal = (
    input: ArrayBuffer | string,
    options: ExcelToJsonOptions
): ExcelToJsonResult => {
    const defaultOptions: Required<ExcelToJsonOptions> = {
        sheets: options.sheets || 'single',
        dateFormat: options.dateFormat || 'DD/MM/YYYY',
        skipEmptyRows: options.skipEmptyRows ?? true,
        skipEmptyColumns: options.skipEmptyColumns ?? true,
        transformHeader: options.transformHeader || defaultHeaderTransform,
        transformValue: options.transformValue || ((value) => value),
        useHeaders: options.useHeaders ?? true,
        headerRow: options.headerRow || 1,
        includeSheetName: options.includeSheetName ?? false,
        parseFormulas: options.parseFormulas ?? true
    };

    const workbook = typeof input === 'string'
        ? XLSX.readFile(input, { cellDates: true, sheetStubs: true })
        : XLSX.read(input, { cellDates: true, sheetStubs: true, type: 'array' });

    const targetSheets = getTargetSheets(workbook.SheetNames, defaultOptions.sheets);

    // If only one sheet is selected, return as array, else as object
    if (
        (typeof defaultOptions.sheets === 'string' && defaultOptions.sheets === 'single') ||
        (Array.isArray(defaultOptions.sheets) && targetSheets.length === 1)
    ) {
        const sheetName = targetSheets[0];
        const worksheet = workbook.Sheets[sheetName];
        return convertWorksheet(worksheet, sheetName, defaultOptions);
    } else {
        const result: MultiSheetResult = {};
        targetSheets.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            result[sheetName] = convertWorksheet(worksheet, sheetName, defaultOptions);
        });
        return result;
    }
};

/**
 * Convert Excel file or buffer to JSON (async).
 * @param input - File path, URL, Buffer, or ArrayBuffer
 * @param options - Conversion options
 * @returns Promise resolving to ExcelToJsonResult
 */
export const excelToJson = async (
    input: ExcelInput,
    options: ExcelToJsonOptions = {}
): Promise<ExcelToJsonResult> => {
    const preparedInput = await prepareInput(input);
    return convertInternal(preparedInput, options);
};

/**
 * Convert Excel file to JSON (sync, local files only).
 * @param filePath - Path to local file
 * @param options - Conversion options
 * @returns ExcelToJsonResult
 */
export const excelToJsonSync = (
    filePath: string,
    options: ExcelToJsonOptions = {}
): ExcelToJsonResult => {
    return convertInternal(filePath, options);
};