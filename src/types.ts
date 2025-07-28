import { SHEET_SELECTION, FILE_TYPES, EXCEL_CELL_TYPES, DEFAULTS } from './constants';

/**
 * Comprehensive configuration interface for Excel/CSV to JSON conversion
 * @interface SpreadsheetConversionConfig
 * @description Designed for scalability and performance with large datasets
 * @since 0.2.6
 * @example
 * const config: SpreadsheetConversionConfig = {
 *   sheetSelection: SHEET_SELECTION.ALL,
 *   shouldSkipEmptyRows: true,
 *   shouldCreateNestedObjects: true
 * };
 */
export interface SpreadsheetConversionConfig {
    /**
     * Sheet selection strategy:
     * - SHEET_SELECTION.ALL: Process all sheets
     * - SHEET_SELECTION.FIRST: Process only the first sheet
     * - string[]: Process sheets by name
     * - number[]: Process sheets by index (0-based)
     * Default: SHEET_SELECTION.FIRST
     */
    sheetSelection?: typeof SHEET_SELECTION.ALL | typeof SHEET_SELECTION.FIRST | string[] | number[];

    /** Date formatting pattern. Default: DEFAULTS.DATE_FORMAT. */
    dateFormatPattern?: string;

    /** Whether to exclude rows with no meaningful data. Default: true. */
    shouldSkipEmptyRows?: boolean;

    /** Whether to exclude columns with no meaningful data. Default: true. */
    shouldSkipEmptyColumns?: boolean;

    /** Whether to ignore index-only rows when determining if a row is empty. Default: true. */
    shouldIgnoreIndexOnlyRows?: boolean;

    /** Custom header transformation function. */
    headerTransformer?: (header: string) => string;

    /** Custom cell value transformation function. */
    valueTransformer?: (value: any, header: string) => any;

    /** Whether to treat first row as column headers. Default: true. */
    hasHeaderRow?: boolean;

    /** Row number containing headers (1-based indexing). Default: 1. */
    headerRowIndex?: number;

    /** Whether to add sheet name as a property to each row. Default: false. */
    shouldIncludeSheetName?: boolean;

    /** Whether to evaluate and parse Excel formulas. Default: true. */
    shouldParseFormulas?: boolean;

    /** Whether to create nested object structures from dot-notation columns. Default: false. */
    shouldCreateNestedObjects?: boolean;

    /** Performance and memory management options. */
    performanceConfig?: PerformanceConfiguration;

    /** CSV-specific parsing options. */
    csvParsingOptions?: CsvParsingConfiguration;

    /** Data validation and error handling options. */
    validationConfig?: ValidationConfiguration;
}

/**
 * Performance and memory management configuration interface
 * @interface PerformanceConfiguration
 * @description Critical for handling large datasets efficiently
 * @since 0.2.6
 */
export interface PerformanceConfiguration {
    /** Maximum number of rows to process in a single batch. Default: 10000. */
    batchSize?: number;

    /** Maximum memory usage in MB before triggering garbage collection. Default: 512. */
    maxMemoryUsageMB?: number;

    /** Whether to use streaming for large files (>100MB). Default: true. */
    enableStreaming?: boolean;

    /** File size threshold in MB for enabling streaming. Default: 50. */
    streamingThresholdMB?: number;

    /** Number of concurrent operations for multi-sheet processing. Default: 4. */
    concurrencyLimit?: number;

    /** Whether to enable progress reporting for large operations. Default: false. */
    enableProgressReporting?: boolean;

    /** Progress callback function. */
    progressCallback?: (progress: ProcessingProgress) => void;

    /** Whether to enable automatic garbage collection. Default: true. */
    enableGarbageCollection?: boolean;

    /** Memory threshold in MB for triggering garbage collection. Default: 256. */
    gcThresholdMB?: number;
}

/**
 * CSV parsing configuration interface with enhanced parsing options
 * @interface CsvParsingConfiguration
 * @since 0.2.6
 */
export interface CsvParsingConfiguration {
    /** Field delimiter character. Auto-detected if not specified. */
    fieldDelimiter?: string;

    /** Quote character for field enclosure. Default: '"'. */
    quoteCharacter?: string;

    /** Escape character for quotes within fields. Default: '"'. */
    escapeCharacter?: string;

    /** Text encoding. Default: DEFAULTS.ENCODING. */
    encoding?: BufferEncoding;

    /** Whether to trim whitespace from fields. Default: true. */
    shouldTrimFields?: boolean;

    /** Whether to skip lines starting with this character. */
    commentCharacter?: string;
}

/**
 * Data validation and error handling configuration.
 */
export interface ValidationConfiguration {
    /** Whether to validate data types during conversion. Default: false. */
    enableTypeValidation?: boolean;

    /** Whether to continue processing on validation errors. Default: true. */
    continueOnValidationError?: boolean;

    /** Maximum number of validation errors before stopping. Default: 100. */
    maxValidationErrors?: number;

    /** Custom validation function for rows. */
    rowValidator?: (row: Record<string, any>, rowIndex: number) => ValidationResult;

    /** Custom validation function for individual cells. */
    cellValidator?: (value: any, columnName: string, rowIndex: number) => ValidationResult;

    /** Whether to collect and return validation errors. Default: false. */
    collectValidationErrors?: boolean;
}

/**
 * Processing progress information for large operations.
 */
export interface ProcessingProgress {
    /** Current sheet being processed. */
    currentSheet: string;

    /** Number of sheets completed. */
    sheetsCompleted: number;

    /** Total number of sheets to process. */
    totalSheets: number;

    /** Number of rows processed in current sheet. */
    rowsProcessed: number;

    /** Estimated total rows in current sheet. */
    estimatedTotalRows: number;

    /** Processing start time. */
    startTime: Date;

    /** Estimated time remaining in milliseconds. */
    estimatedTimeRemainingMs?: number;
}

/**
 * Result of data validation.
 */
export interface ValidationResult {
    /** Whether the validation passed. */
    isValid: boolean;

    /** Error messages if validation failed. */
    errors?: ValidationError[];

    /** Warnings that don't prevent processing. */
    warnings?: string[];
}

/**
 * Comprehensive result from conversion operation.
 */
export interface ConversionResult<T = Record<string, any>[]> {
    /** The converted data. */
    data: T;

    /** Metadata about the conversion process. */
    metadata: ConversionMetadata;
}

/**
 * Metadata about the conversion process.
 */
export interface ConversionMetadata {
    /** Source file information. */
    sourceFile: SourceFileInfo;

    /** Sheets that were processed. */
    sheetsProcessed: ProcessedSheetInfo[];

    /** Total number of rows processed. */
    totalRows: number;

    /** Total number of sheets processed. */
    totalSheets: number;

    /** Total processing time in milliseconds. */
    processingTimeMs: number;

    /** Performance metrics for the conversion operation. */
    performanceMetrics?: PerformanceMetrics;

    /** Validation errors collected during processing. */
    validationErrors?: ValidationError[];

    /** Configuration used for conversion. */
    conversionConfig?: SpreadsheetConversionConfig;

    /** Processing timestamp. */
    processedAt?: Date;
}

/**
 * Information about the source file.
 */
export interface SourceFileInfo {
    /** File type detected. */
    fileType: typeof FILE_TYPES.XLSX | typeof FILE_TYPES.XLS | typeof FILE_TYPES.CSV | typeof FILE_TYPES.URL | typeof FILE_TYPES.BUFFER;

    /** Original file path or URL. */
    source: string;

    /** File size in bytes (if available). */
    fileSizeBytes?: number;

    /** MIME type detected. */
    mimeType?: string;
}

/**
 * Information about a processed sheet.
 */
export interface ProcessedSheetInfo {
    /** Sheet name. */
    name: string;

    /** Sheet index in workbook. */
    index: number;

    /** Number of rows processed. */
    rowCount: number;

    /** Number of columns detected. */
    columnCount: number;

    /** Processing time in milliseconds. */
    processingTimeMs: number;
}

/**
 * Performance metrics for the conversion operation.
 */
export interface PerformanceMetrics {
    /** Total processing time in milliseconds. */
    totalProcessingTimeMs: number;

    /** Memory usage peak in MB. */
    peakMemoryUsageMB: number;

    /** Number of rows processed per second. */
    rowsPerSecond: number;

    /** Whether streaming was used. */
    streamingUsed: boolean;

    /** Number of garbage collection cycles triggered. */
    gcCycles?: number;
}

/**
 * Validation error details.
 */
export interface ValidationError {
    /** Sheet name where error occurred. */
    sheetName: string;

    /** Row index where error occurred (0-based). */
    rowIndex: number;

    /** Column name where error occurred. */
    columnName?: string;

    /** Error message. */
    message: string;

    /** Severity level. */
    severity: 'error' | 'warning';

    /** The invalid value. */
    invalidValue?: any;
}

/**
 * Result from a single sheet conversion with enhanced metadata.
 */
export interface ProcessedSheetResult {
    /** Array of row objects. */
    data: Record<string, any>[];
    /** Processing metadata. */
    metadata: ProcessedSheetInfo;
}

/** Excel cell types with enhanced type safety. */
export type ExcelCellType =
    | typeof EXCEL_CELL_TYPES.NUMBER
    | typeof EXCEL_CELL_TYPES.DATE
    | typeof EXCEL_CELL_TYPES.BOOLEAN
    | typeof EXCEL_CELL_TYPES.STRING
    | typeof EXCEL_CELL_TYPES.STRING_FORMULA
    | typeof EXCEL_CELL_TYPES.ERROR;

/** 
 * Enhanced input types for the converter with better type safety.
 * Supports file paths, URLs, various buffer types, and streams.
 */
export type SpreadsheetInput = string | ArrayBuffer | Buffer | Uint8Array | ReadableStream;

/** Return type for single sheet conversion with metadata. */
export type SingleSheetConversionResult = ConversionResult<Record<string, any>[]>;

/** Return type for multiple sheet conversion with metadata. */
export type MultiSheetConversionResult = ConversionResult<Record<string, Record<string, any>[]>>;

/** 
 * Combined return type for all conversion operations.
 * Provides comprehensive result information including metadata and performance metrics.
 */
export type SpreadsheetConversionResult = SingleSheetConversionResult | MultiSheetConversionResult;

/**
 * Configuration for streaming large files.
 */
export interface StreamingConfiguration {
    /** Whether to enable streaming mode. */
    enabled: boolean;

    /** Chunk size for reading data. */
    chunkSize: number;

    /** Buffer size for processing. */
    bufferSize: number;

    /** Whether to use worker threads for processing. */
    useWorkerThreads: boolean;

    /** Maximum number of worker threads. */
    maxWorkerThreads: number;
}

/**
 * Error types that can occur during conversion.
 */
export enum ConversionErrorType {
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
    NETWORK_ERROR = 'NETWORK_ERROR',
    PARSING_ERROR = 'PARSING_ERROR',
    MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Enhanced error class for conversion operations.
 */
export class SpreadsheetConversionError extends Error {
    public readonly errorType: ConversionErrorType;
    public readonly originalError?: Error;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        errorType: ConversionErrorType = ConversionErrorType.UNKNOWN_ERROR,
        originalError?: Error,
        context?: Record<string, any>
    ) {
        super(message);
        this.name = 'SpreadsheetConversionError';
        this.errorType = errorType;
        this.originalError = originalError;
        this.context = context;

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SpreadsheetConversionError);
        }
    }
}

/**
 * Memory usage monitoring interface.
 */
export interface MemoryUsageInfo {
    /** Used memory in bytes. */
    used: number;

    /** Total available memory in bytes. */
    total: number;

    /** Memory usage percentage. */
    percentage: number;

    /** Whether memory limit is exceeded. */
    isLimitExceeded: boolean;
}

/**
 * Cache configuration for improved performance with repeated operations.
 */
export interface CacheConfiguration {
    /** Whether to enable caching. */
    enabled: boolean;

    /** Maximum cache size in MB. */
    maxSizeMB: number;

    /** Cache TTL in milliseconds. */
    ttlMs: number;

    /** Cache key strategy. */
    keyStrategy: 'file-hash' | 'file-path' | 'custom';

    /** Custom cache key generator. */
    customKeyGenerator?: (input: SpreadsheetInput) => string;
}