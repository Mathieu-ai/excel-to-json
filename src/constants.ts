/**
 * Constants file for excel-to-json library
 * Contains all hardcoded values used throughout the codebase
 * @since 0.8.0
 */

// ANCHOR Sheet Selection Constants
export const SHEET_SELECTION = {
    ALL: 'all' as const,
    FIRST: 'first' as const
} as const;

// ANCHOR File Type Constants
export const FILE_TYPES = {
    XLSX: 'xlsx' as const,
    XLS: 'xls' as const,
    CSV: 'csv' as const,
    URL: 'url' as const,
    BUFFER: 'buffer' as const,
    UNKNOWN: 'unknown' as const
} as const;

// ANCHOR File Extension Constants
export const FILE_EXTENSIONS = {
    XLSX: '.xlsx' as const,
    XLS: '.xls' as const,
    CSV: '.csv' as const
} as const;

// ANCHOR Excel Cell Type Constants
export const EXCEL_CELL_TYPES = {
    NUMBER: 'n' as const,
    DATE: 'd' as const,
    BOOLEAN: 'b' as const,
    STRING: 's' as const,
    STRING_FORMULA: 'str' as const,
    ERROR: 'e' as const
} as const;

// ANCHOR Date Format Constants
export const DATE_FORMATS = {
    ISO: 'YYYY-MM-DD' as const,
    EU: 'DD/MM/YYYY' as const,
    US: 'MM/DD/YYYY' as const,
    DATETIME_ISO: 'YYYY-MM-DD-HH-mm-ss' as const
} as const;

// ANCHOR Default Values
export const DEFAULTS = {
    DATE_FORMAT: DATE_FORMATS.EU,
    ENCODING: 'utf-8' as const,
    SHEET_SELECTION: SHEET_SELECTION.FIRST,
    SKIP_EMPTY_ROWS: true,
    SKIP_EMPTY_COLUMNS: true,
    IGNORE_INDEX_ONLY_ROWS: true,
    CREATE_NESTED_OBJECTS: false,
    HEADER_ROW_INDEX: 0,
    PARSE_FORMULAS: false,
    INCLUDE_SHEET_NAME: false
} as const;

// ANCHOR CSV Parsing Constants
export const CSV_DELIMITERS = {
    COMMA: ',' as const,
    SEMICOLON: ';' as const,
    TAB: '\t' as const,
    PIPE: '|' as const
} as const;

export const CSV_QUOTE_CHARS = {
    DOUBLE_QUOTE: '"' as const,
    SINGLE_QUOTE: "'" as const
} as const;

export const CSV_BOOLEAN_VALUES = {
    TRUE_VALUES: ['true', 'yes', 'y'],
    FALSE_VALUES: ['false', 'no', 'n'],
    ALL_BOOLEAN_VALUES: ['true', 'false', 'yes', 'no', 'y', 'n']
} as const;

// ANCHOR Network Constants
export const NETWORK = {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    PROTOCOLS: {
        HTTP: 'http:' as const,
        HTTPS: 'https:' as const
    }
} as const;

// ANCHOR File Signature Constants (for binary detection)
export const FILE_SIGNATURES = {
    XLSX_ZIP: [0x50, 0x4B, 0x03, 0x04], // ZIP signature for XLSX
    XLS_OLE: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] // OLE signature for XLS
} as const;

// ANCHOR Header Processing Constants
export const HEADER_CONSTANTS = {
    COLUMN_PREFIX: 'Column_' as const,
    EMPTY_HEADER_PREFIX: 'Empty_Header_' as const,
    REPLACEMENT_CHAR: '_' as const,
    SPECIAL_CHARS_REGEX: /[^\w\s]/g,
    SPACES_REGEX: /\s+/g,
    MULTIPLE_UNDERSCORES_REGEX: /_+/g,
    LEADING_TRAILING_UNDERSCORES_REGEX: /^_|_$/g
} as const;

// ANCHOR Excel Parser Constants
export const EXCEL_PARSER = {
    READ_TYPE: 'buffer' as const,
    DEFAULT_RANGE: 'A1:A1' as const,
    CELL_DATES: true,
    CELL_STYLES: false,
    CELL_NF: false,
    SHEET_STUBS: false
} as const;

// ANCHOR URL and Path Constants
export const URL_PATTERNS = {
    FILE_EXTENSION_REGEX: /\.(xlsx?|csv)$/i,
    PATH_REGEX: /^([a-zA-Z]:\\|\/|\.{1,2}[\/\\])/,
    GOOGLE_SHEETS_REGEX: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
} as const;

export const GOOGLE_SHEETS = {
    EXPORT_URL_TEMPLATE: 'https://docs.google.com/spreadsheets/d/{id}/export?format=xlsx' as const,
    FORMAT: 'xlsx' as const
} as const;

// ANCHOR Validation Constants
export const VALIDATION = {
    DEFAULT_SHEET_NAME: 'Unknown' as const,
    SUSPICIOUS_PATTERNS: [
        '<script',
        'javascript:',
        'data:',
        'vbscript:'
    ],
    PROBLEMATIC_HEADERS: [
        '__proto__',
        'constructor',
        'prototype'
    ],
    PATH_TRAVERSAL_PATTERNS: [
        './',
        '../',
        '/'
    ]
} as const;

// ANCHOR Performance Constants
export const PERFORMANCE = {
    DEFAULT_BATCH_SIZE: 1000,
    MIN_BATCH_SIZE: 100,
    MAX_BATCH_SIZE: 10000,
    MEMORY_THRESHOLD_MB: 512,
    GC_THRESHOLD_MB: 256,
    STREAMING_THRESHOLD_MB: 50
} as const;

// ANCHOR Error Messages
export const ERROR_MESSAGES = {
    UNSUPPORTED_INPUT_TYPE: 'Unsupported input type',
    STRING_INPUT_NOT_SUPPORTED: 'String input not supported for Excel parsing. Use buffer or file path processing.',
    INVALID_CSV_CONTENT: 'Invalid CSV content provided',
    FAILED_TO_FETCH: 'Failed to fetch file from {url} after {retries} attempts: {error}',
    FAILED_TO_FETCH_SIMPLE: 'Failed to fetch file from {url}',
    HTTP_ERROR: 'HTTP {status}: {statusText}',
    UNKNOWN_ERROR: 'Unknown error'
} as const;

// ANCHOR HTTP Status Constants
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
} as const;

// ANCHOR CSV Source Name
export const CSV_SOURCE_NAME = 'CSV' as const;

// ANCHOR Numeric Constants
export const NUMERIC_PATTERNS = {
    NUMERIC_INDEX_REGEX: /^\d+$/,
    INTEGER_REGEX: /^-?\d+$/,
    FLOAT_REGEX: /^-?\d*\.?\d+$/
} as const;
