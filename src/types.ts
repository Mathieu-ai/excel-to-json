/**
 * Options for Excel to JSON conversion.
 */
export interface ExcelToJsonOptions {
    /**
     * Sheets to include:
     * - 'all': All sheets
     * - 'single': First sheet only
     * - string[]: One or more sheet names (e.g. ['Sheet1'] or ['Sheet1', 'Sheet2'])
     * - number[]: One or more sheet indices (0-based, e.g. [0] or [0,2])
     * Default: 'single'
     */
    sheets?: 'all' | 'single' | string[] | number[];
    /** Date format string. Default: 'DD/MM/YYYY'. */
    dateFormat?: string;
    /** Skip rows with no data. Default: true. */
    skipEmptyRows?: boolean;
    /** Skip columns with no header. Default: true. */
    skipEmptyColumns?: boolean;
    /** Transform header names. */
    transformHeader?: (header: string) => string;
    /** Transform cell values. */
    transformValue?: (value: any, header: string) => any;
    /** Use first row as headers. Default: true. */
    useHeaders?: boolean;
    /** Row number for headers (1-based). Default: 1. */
    headerRow?: number;
    /** Include sheet name in each row. Default: false. */
    includeSheetName?: boolean;
    /** Parse and use formula results. Default: true. */
    parseFormulas?: boolean;
}
/**
 * Result from a single sheet conversion.
 */
export interface SheetResult {
    /** Name of the sheet. */
    sheetName: string;
    /** Array of row objects. */
    data: Record<string, any>[];
}
/** Excel cell types. */
export type ExcelCellType =
    | 'n'   // Number
    | 'd'   // Date
    | 'b'   // Boolean
    | 's'   // String
    | 'str' // String (formula result)
    | 'e';  // Error
/** Input types accepted by the converter. */
export type ExcelInput = string | ArrayBuffer | Buffer;
/** Return type for single sheet conversion. */
export type SingleSheetResult = Record<string, any>[];
/** Return type for multiple sheet conversion. */
export type MultiSheetResult = Record<string, Record<string, any>[]>;
/** Combined return type. */
export type ExcelToJsonResult = SingleSheetResult | MultiSheetResult;