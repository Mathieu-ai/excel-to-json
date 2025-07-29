import * as XLSX from 'xlsx';
import { SpreadsheetConversionConfig } from '../types';
import { DateFormatter } from '../utils/date-formatter';
import { HeaderProcessor } from '../utils/header-processor';
import {
    EXCEL_PARSER,
    EXCEL_CELL_TYPES,
    ERROR_MESSAGES
} from '../constants';
import {
    isString,
    isUndefined
} from 'generic-functions.mlai';

/**
 * Excel file parser with enhanced parsing features and optimizations
 * @class ExcelParser
 * @since 0.2.6
 */
export class ExcelParser {
    /**
     * Parse Excel workbook from ArrayBuffer input
     * @param {ArrayBuffer | string} input - Binary data of Excel file
     * @returns {XLSX.WorkBook} Parsed workbook object with all sheets
     * @throws {Error} When string input is provided (not supported)
     * @since 0.2.6
     * @example
     * const parser = new ExcelParser();
     * const workbook = parser.parseWorkbook(buffer);
     */
    public parseWorkbook (input: ArrayBuffer | string): XLSX.WorkBook {
        if (isString(input)) {
            throw new Error(ERROR_MESSAGES.STRING_INPUT_NOT_SUPPORTED);
        }

        return XLSX.read(input, {
            type: EXCEL_PARSER.READ_TYPE,
            cellDates: EXCEL_PARSER.CELL_DATES,
            cellStyles: EXCEL_PARSER.CELL_STYLES,
            cellNF: EXCEL_PARSER.CELL_NF,
            sheetStubs: EXCEL_PARSER.SHEET_STUBS
        });
    }

    /**
     * Parse a single Excel worksheet to JSON array
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet object to parse
     * @param {string} sheetName - Name of the worksheet being parsed
     * @param {Required<SpreadsheetConversionConfig>} config - Complete configuration with all defaults applied
     * @returns {Record<string, any>[]} Array of row objects with parsed data
     * @since 0.2.6
     * @example
     * const data = parser.parseWorksheet(worksheet, 'Sheet1', config);
     * console.log(data); // [{ name: 'John', age: 30 }, ...]
     */
    public parseWorksheet (
        worksheet: XLSX.WorkSheet,
        sheetName: string,
        config: Required<SpreadsheetConversionConfig>
    ): Record<string, any>[] {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || EXCEL_PARSER.DEFAULT_RANGE);

        // SECTION Extract headers and determine starting row
        const { headers, startRow } = this.processWorksheetHeaders(worksheet, range, config);

        // SECTION Extract data rows
        return this.extractDataRows(worksheet, range, headers, startRow, sheetName, config);
    }

    /**
     * Process worksheet headers and determine data starting row
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet
     * @param {any} range - Worksheet range
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @returns {{ headers: Record<string, string>, startRow: number }} Headers and starting row
     * @private
     * @since 0.8.0
     */
    private processWorksheetHeaders (
        worksheet: XLSX.WorkSheet,
        range: any,
        config: Required<SpreadsheetConversionConfig>
    ): { headers: Record<string, string>; startRow: number } {
        if (isUndefined(config.headerRowIndex)) {
            return { headers: {}, startRow: 0 };
        }

        const headerExtractionResult = this.extractHeaders(worksheet, range, config);
        const baseStartRow = config.headerRowIndex + 1;

        return {
            headers: headerExtractionResult.headers,
            startRow: headerExtractionResult.usedNextRowForHeaders ? baseStartRow + 1 : baseStartRow
        };
    }

    /**
     * Extract data rows from worksheet
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet
     * @param {any} range - Worksheet range
     * @param {Record<string, string>} headers - Column headers map
     * @param {number} startRow - Starting row for data extraction
     * @param {string} sheetName - Sheet name
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @returns {Record<string, any>[]} Extracted data rows
     * @private
     * @since 0.8.0
     */
    private extractDataRows (
        worksheet: XLSX.WorkSheet,
        range: any,
        headers: Record<string, string>,
        startRow: number,
        sheetName: string,
        config: Required<SpreadsheetConversionConfig>
    ): Record<string, any>[] {
        const data: Record<string, any>[] = [];

        for (let row = startRow; row <= range.e.r; row++) {
            const rowData = this.processDataRow(worksheet, range, headers, row, config);

            const hasData = this.hasNonEmptyData(rowData);
            if (hasData || !config.shouldSkipEmptyRows) {
                if (config.shouldIncludeSheetName) {
                    rowData._sheet = sheetName;
                }
                data.push(rowData);
            }
        }

        return data;
    }

    /**
     * Process a single data row
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet
     * @param {any} range - Worksheet range
     * @param {Record<string, string>} headers - Column headers map
     * @param {number} row - Row index
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @returns {Record<string, any>} Processed row data
     * @private
     * @since 0.8.0
     */
    private processDataRow (
        worksheet: XLSX.WorkSheet,
        range: any,
        headers: Record<string, string>,
        row: number,
        config: Required<SpreadsheetConversionConfig>
    ): Record<string, any> {
        const rowData: Record<string, any> = {};

        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            const colName = XLSX.utils.encode_col(col);
            const columnKey = headers[colName] || colName;

            const value = this.extractCellValue(cell, config, columnKey);
            rowData[columnKey] = value;
        }

        return rowData;
    }

    /**
     * Extract and process value from a cell
     * @param {any} cell - Excel cell object
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @param {string} columnKey - Column identifier
     * @returns {any} Processed cell value
     * @private
     * @since 0.8.0
     */
    private extractCellValue (
        cell: any,
        config: Required<SpreadsheetConversionConfig>,
        columnKey: string
    ): any {
        if (!cell) return null;

        const value = config.shouldParseFormulas && cell.f ? cell.v : cell.v;
        return this.processCellValue(cell, value, config, columnKey);
    }

    /**
     * Check if row data has any non-empty values
     * @param {Record<string, any>} rowData - Row data to check
     * @returns {boolean} True if row has non-empty data
     * @private
     * @since 0.8.0
     */
    private hasNonEmptyData (rowData: Record<string, any>): boolean {
        return Object.values(rowData).some(value =>
            value !== null && value !== undefined && value !== ''
        );
    }

    /**
     * Process cell value based on its type using efficient switch pattern
     * @param {any} cell - Excel cell object
     * @param {any} value - Raw cell value
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @param {string} columnKey - Column identifier
     * @returns {any} Processed cell value
     */
    private processCellValue (
        cell: any,
        value: any,
        config: Required<SpreadsheetConversionConfig>,
        columnKey: string
    ): any {
        switch (cell.t) {
            case EXCEL_CELL_TYPES.DATE:
            case EXCEL_CELL_TYPES.NUMBER:
                if (cell.t === EXCEL_CELL_TYPES.DATE || XLSX.SSF.is_date(cell.z || '')) {
                    if (value instanceof Date) {
                        value = DateFormatter.formatDateOptimized(value, config.dateFormatPattern);
                    }
                }
                break;

            case EXCEL_CELL_TYPES.BOOLEAN:
                value = Boolean(value);
                break;

            default:
                // No special processing needed for other types
                break;
        }

        // Apply value transformation if configured
        if (config.valueTransformer) {
            value = config.valueTransformer(value, columnKey);
        }

        return value;
    }

    /**
     * Extract headers from worksheet with duplicate logic elimination
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet
     * @param {any} range - Cell range
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @returns {{ headers: Record<string, string>, usedNextRowForHeaders: boolean }} Header extraction result
     */
    private extractHeaders (
        worksheet: XLSX.WorkSheet,
        range: any,
        config: Required<SpreadsheetConversionConfig>
    ): { headers: Record<string, string>; usedNextRowForHeaders: boolean } {
        let actualHeaderRow = config.headerRowIndex;
        let headers = this.extractHeadersFromRow(worksheet, range, actualHeaderRow, config);

        // Check if we got mostly column letters as headers (indicates Google Sheets export issue)
        const headerValues = Object.values(headers);
        const columnLetterPattern = /^[A-Z]{1,2}$/;
        const columnLetterCount = headerValues.filter(value => columnLetterPattern.test(value)).length;

        if (headerValues.length > 0 && columnLetterCount / headerValues.length > 0.7) {
            // More than 70% of headers are column letters, try next row
            actualHeaderRow = config.headerRowIndex + 1;
            if (actualHeaderRow <= range.e.r) {
                headers = this.extractHeadersFromRow(worksheet, range, actualHeaderRow, config);
                return { headers, usedNextRowForHeaders: true };
            }
        }

        return { headers, usedNextRowForHeaders: false };
    }

    /**
     * Extract headers from a specific row (eliminates duplicate code)
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet
     * @param {any} range - Cell range
     * @param {number} rowIndex - Row index to extract headers from
     * @param {Required<SpreadsheetConversionConfig>} config - Configuration
     * @returns {Record<string, string>} Headers map
     */
    private extractHeadersFromRow (
        worksheet: XLSX.WorkSheet,
        range: any,
        rowIndex: number,
        config: Required<SpreadsheetConversionConfig>
    ): Record<string, string> {
        const headers: Record<string, string> = {};

        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
                let headerValue = String(cell.v);
                headerValue = config.headerTransformer
                    ? config.headerTransformer(headerValue)
                    : HeaderProcessor.transformHeaderWithFallback(headerValue);

                if (headerValue) {
                    headers[XLSX.utils.encode_col(col)] = headerValue;
                }
            }
        }

        return headers;
    }
}
