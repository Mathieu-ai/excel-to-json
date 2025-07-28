import { SpreadsheetConverter } from '../core/spreadsheet-converter';
import { SHEET_SELECTION } from '../constants';
import {
    SpreadsheetConversionConfig,
    SpreadsheetInput
} from '../types';

/**
 * Transform Excel or CSV files into JSON with advanced features including nested objects, Google Sheets support, and multiple sheet handling.
 * Uses the modern spreadsheet converter engine.
 * @function excelToJson
 * @param {SpreadsheetInput} input - File path, URL, or buffer data to convert
 * @param {SpreadsheetConversionConfig} [config={}] - Configuration options for conversion
 * @param {string} [config.sheetSelection=SHEET_SELECTION.FIRST] - Which sheets to process (SHEET_SELECTION.ALL, SHEET_SELECTION.FIRST, or array of names/indices)
 * @param {boolean} [config.shouldSkipEmptyRows=true] - Skip empty rows during processing
 * @param {boolean} [config.shouldCreateNestedObjects=false] - Create nested objects from dot notation
 * @returns {Promise<any>} Promise resolving to converted JSON data (array for single sheet, object for multiple sheets)
 * @since 0.2.6
 * @example
 * // Convert single Excel file
 * const data = await excelToJson('data.xlsx');
 * // Convert with nested objects
 * const data = await excelToJson('data.xlsx', { shouldCreateNestedObjects: true });
 * // Convert specific sheets
 * const data = await excelToJson('data.xlsx', { sheetSelection: ['Sheet1', 'Sheet2'] });
 */
export async function excelToJson (
    input: SpreadsheetInput,
    config: SpreadsheetConversionConfig = {}
): Promise<any> {
    const converter = new SpreadsheetConverter(config);
    const result = await converter.convertToJson(input);
    return result.data;
}
