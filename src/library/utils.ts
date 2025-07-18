import { removeBreakLines, trim } from 'generic-functions.mlai/core/string';
import { ExcelInput } from '../types';

/**
 * Default header transformer: removes break lines and trims whitespace.
 * @param header - Header string
 * @returns Cleaned header string
 */
export const defaultHeaderTransform = (header: string): string => 
    removeBreakLines(trim(header));

/**
 * Format a Date object according to a format string.
 * @param date - Date object
 * @param format - Format string (e.g. 'YYYY-MM-DD')
 * @returns Formatted date string
 */
export const formatDate = (date: Date, format: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return format
        .replace('YYYY', String(year))
        .replace('YY', String(year).slice(-2))
        .replace('MM', month)
        .replace('DD', day);
};

/**
 * Check if a string is a URL.
 * @param input - Input string
 * @returns True if input is a URL
 */
export const isUrl = (input: string): boolean => 
    /^(https?|ftp):\/\//i.test(input);

/**
 * Check if a string is a Google Sheets URL.
 * @param input - Input string
 * @returns True if input is a Google Sheets URL
 */
const isGoogleSheetsUrl = (input: string): boolean => 
    /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+/i.test(input);

/**
 * Convert a Google Sheets URL to a direct XLSX export URL.
 * @param input - Google Sheets URL
 * @returns Export URL
 */
const googleSheetsToXlsxUrl = (input: string): string => {
    // Extract the spreadsheet ID
    const match = input.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);
    if (!match) return input;
    const id = match[1];
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
};

/**
 * Fetch a file from a URL as ArrayBuffer.
 * @param url - File URL
 * @returns ArrayBuffer of file content
 */
export const fetchFile = async (url: string): Promise<ArrayBuffer> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return response.arrayBuffer();
};

/**
 * Prepare input for XLSX: handles file paths, URLs, Buffers, and ArrayBuffers.
 * @param input - ExcelInput
 * @returns ArrayBuffer or file path string
 */
export const prepareInput = async (input: ExcelInput): Promise<ArrayBuffer | string> => {
    if (typeof input === 'string') {
        if (isGoogleSheetsUrl(input)) {
            // Convert Google Sheets URL to direct XLSX export
            const exportUrl = googleSheetsToXlsxUrl(input);
            return fetchFile(exportUrl);
        }
        if (isUrl(input)) {
            return fetchFile(input);
        }
        return input; // File path
    }
    
    if (Buffer.isBuffer(input)) {
        // If input.buffer is a SharedArrayBuffer, convert it to ArrayBuffer
        const buf = input.buffer;
        if (buf instanceof SharedArrayBuffer) {
            // Copy the relevant bytes into a new ArrayBuffer
            const arrayBuffer = new ArrayBuffer(input.byteLength);
            const uint8View = new Uint8Array(arrayBuffer);
            uint8View.set(new Uint8Array(buf, input.byteOffset, input.byteLength));
            return arrayBuffer;
        }
        return buf.slice(input.byteOffset, input.byteOffset + input.byteLength);
    }
    
    // Handle SharedArrayBuffer by converting to ArrayBuffer
    if (input instanceof SharedArrayBuffer) {
        // Copy all bytes into a new ArrayBuffer
        const arrayBuffer = new ArrayBuffer(input.byteLength);
        const uint8View = new Uint8Array(arrayBuffer);
        uint8View.set(new Uint8Array(input));
        return arrayBuffer;
    }
    
    return input; // ArrayBuffer
};

/**
 * Get sheet names to process based on user options.
 * @param sheetNames - All sheet names in workbook
 * @param sheets - User selection
 * @returns Array of sheet names to process
 */
export const getTargetSheets = (
    sheetNames: string[], 
    sheets: 'all' | 'single' | string[] | number[]
): string[] => {
    if (sheets === 'all') {
        return sheetNames;
    }
    if (sheets === 'single') {
        return sheetNames.slice(0, 1);
    }
    if (Array.isArray(sheets)) {
        if (typeof sheets[0] === 'number') {
            // Select by index
            return (sheets as number[])
                .filter(index => index >= 0 && index < sheetNames.length)
                .map(index => sheetNames[index]);
        }
        // Select by name
        return (sheets as string[]).filter(name => sheetNames.includes(name));
    }
    // fallback: first sheet
    return sheetNames.slice(0, 1);
};

/**
 * Remove empty rows and columns from data.
 * @param data - Array of row objects
 * @param skipEmptyRows - Remove rows with no data
 * @param skipEmptyColumns - Remove columns with no data
 * @returns Cleaned data array
 */
export const cleanData = (
    data: Record<string, any>[], 
    skipEmptyRows: boolean, 
    skipEmptyColumns: boolean
): Record<string, any>[] => {
    if (!skipEmptyRows && !skipEmptyColumns) {
        return data;
    }
    
    let cleaned = data;
    
    if (skipEmptyRows) {
        cleaned = cleaned.filter(row => 
            Object.values(row).some(value => 
                value !== null && value !== undefined && value !== ''
            )
        );
    }
    
    if (skipEmptyColumns) {
        const columnsToKeep = new Set<string>();
        cleaned.forEach(row => {
            Object.entries(row).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    columnsToKeep.add(key);
                }
            });
        });
        
        cleaned = cleaned.map(row => {
            const cleanedRow: Record<string, any> = {};
            columnsToKeep.forEach(col => {
                if (col in row) {
                    cleanedRow[col] = row[col];
                }
            });
            return cleanedRow;
        });
    }
    
    return cleaned;
};
