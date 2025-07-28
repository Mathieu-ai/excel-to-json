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
        const data: Record<string, any>[] = [];
        const headers: Record<string, string> = {};

        const range = XLSX.utils.decode_range(worksheet['!ref'] || EXCEL_PARSER.DEFAULT_RANGE);

        // SECTION Extract headers from first row if configured
        if (!isUndefined(config.headerRowIndex)) {
            let actualHeaderRow = config.headerRowIndex;
            let usedNextRowForHeaders = false;

            // First attempt: try the configured header row
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: actualHeaderRow, c: col });
                const cell = worksheet[cellAddress];
                if (cell && cell.v) {
                    let headerValue = String(cell.v);
                    if (config.headerTransformer) {
                        headerValue = config.headerTransformer(headerValue);
                    } else {
                        headerValue = HeaderProcessor.transformHeaderWithFallback(headerValue);
                    }
                    if (headerValue) {
                        headers[XLSX.utils.encode_col(col)] = headerValue;
                    }
                }
            }

            // Check if we got mostly column letters as headers (indicates Google Sheets export issue)
            const headerValues = Object.values(headers);
            const columnLetterPattern = /^[A-Z]{1,2}$/;
            const columnLetterCount = headerValues.filter(value => columnLetterPattern.test(value)).length;

            if (headerValues.length > 0 && columnLetterCount / headerValues.length > 0.7) {
                // More than 70% of headers are column letters, try next row
                actualHeaderRow = config.headerRowIndex + 1;
                usedNextRowForHeaders = true;

                // Clear headers and try next row
                Object.keys(headers).forEach(key => delete headers[key]);

                if (actualHeaderRow <= range.e.r) {
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: actualHeaderRow, c: col });
                        const cell = worksheet[cellAddress];
                        if (cell && cell.v) {
                            let headerValue = String(cell.v);
                            if (config.headerTransformer) {
                                headerValue = config.headerTransformer(headerValue);
                            } else {
                                headerValue = HeaderProcessor.transformHeaderWithFallback(headerValue);
                            }
                            if (headerValue) {
                                headers[XLSX.utils.encode_col(col)] = headerValue;
                            }
                        }
                    }
                }
            }

            // Store whether we used next row for data extraction logic
            (headers as any)._usedNextRowForHeaders = usedNextRowForHeaders;
        }        // SECTION Extract data rows starting after header row
        let startRow = !isUndefined(config.headerRowIndex) ? config.headerRowIndex + 1 : 0;

        // If we used the next row for headers due to column letter detection, adjust start row
        const usedNextRowForHeaders = (headers as any)._usedNextRowForHeaders;
        if (usedNextRowForHeaders) {
            startRow = config.headerRowIndex + 2; // Skip both the column letters row and the actual headers row
        }

        // Clean up the temporary flag
        delete (headers as any)._usedNextRowForHeaders;

        for (let row = startRow; row <= range.e.r; row++) {
            const rowData: Record<string, any> = {};
            let hasData = false;

            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                const colName = XLSX.utils.encode_col(col);
                const columnKey = headers[colName] || colName;
                let value: any = null;

                if (cell) {
                    value = config.shouldParseFormulas && cell.f ? cell.v : cell.v;

                    // NOTE Format dates using optimized formatter
                    if (cell.t === EXCEL_CELL_TYPES.DATE || (cell.t === EXCEL_CELL_TYPES.NUMBER && XLSX.SSF.is_date(cell.z || ''))) {
                        if (value instanceof Date) {
                            value = DateFormatter.formatDateOptimized(value, config.dateFormatPattern);
                        }
                    }

                    // NOTE Format booleans to ensure proper type
                    if (cell.t === EXCEL_CELL_TYPES.BOOLEAN) {
                        value = Boolean(value);
                    }

                    // ANCHOR Apply value transformation if configured
                    if (config.valueTransformer) {
                        value = config.valueTransformer(value, columnKey);
                    }

                    if (value !== null && value !== undefined && value !== '') {
                        hasData = true;
                    }
                }

                rowData[columnKey] = value;
            }

            if (hasData || !config.shouldSkipEmptyRows) {
                if (config.shouldIncludeSheetName) {
                    rowData._sheet = sheetName;
                }
                data.push(rowData);
            }
        }

        return data;
    }
}
