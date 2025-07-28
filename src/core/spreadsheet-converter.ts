import * as XLSX from 'xlsx';
import {
    SpreadsheetConversionConfig,
    SpreadsheetConversionResult,
    SingleSheetConversionResult,
    MultiSheetConversionResult,
    SpreadsheetInput,
    ProcessedSheetResult,
    ConversionMetadata,
    SourceFileInfo,
    ProcessedSheetInfo
} from '../types';

import {
    SHEET_SELECTION,
    FILE_TYPES,
    DEFAULTS,
    CSV_SOURCE_NAME,
    PERFORMANCE
} from '../constants';

import { SpreadsheetPerformanceMonitor } from '../validators/performance-monitor';
import { SpreadsheetDataValidator } from '../validators/data-validator';
import { FileTypeDetector } from '../utils/file-type-detector';
import { InputProcessor } from '../utils/input-processor';
import { ExcelParser } from '../parsers/excel-parser';
import { CsvParser } from '../parsers/csv-parser';
import { DataCleaner } from '../utils/data-cleaner';
import { NestedObjectBuilder } from '../utils/nested-object-builder';
import {
    isString,
    filter,
    includes,
    slice,
    map,
    forEach,
    entries,
    reduce,
    defaults,
    keys,
    join,
    isEmpty
} from 'generic-functions.mlai';


/**
 * Transform Excel files into JSON with advanced features including nested objects, Google Sheets support, and multiple sheet handling.
 * Enterprise-grade spreadsheet to JSON converter with advanced features.
 * @class SpreadsheetConverter
 * @description Designed for scalability, performance, and reliability with large datasets. Supports nested objects, Google Sheets, and multiple sheet handling.
 * @since 0.2.6
 * @example
 * const converter = new SpreadsheetConverter({ shouldSkipEmptyRows: true });
 * const result = await converter.convertToJson('data.xlsx');
 * console.log(result.data); // Converted JSON data
 */
export class SpreadsheetConverter {
    private performanceMonitor: SpreadsheetPerformanceMonitor;
    private dataValidator: SpreadsheetDataValidator;
    private configuration: Required<SpreadsheetConversionConfig>;

    /**
     * Create a new SpreadsheetConverter instance
     * @param {SpreadsheetConversionConfig} [config={}] - Configuration options for the converter
     * @param {string} [config.sheetSelection=SHEET_SELECTION.FIRST] - Which sheets to process
     * @param {boolean} [config.shouldSkipEmptyRows=true] - Skip empty rows during processing
     * @param {boolean} [config.shouldCreateNestedObjects=false] - Create nested objects from dot notation
     * @since 0.2.6
     * @example
     * // Basic usage
     * const converter = new SpreadsheetConverter();
     * 
     * // With configuration
     * const converter = new SpreadsheetConverter({
     *   shouldSkipEmptyRows: true,
     *   shouldCreateNestedObjects: true
     * });
     */
    constructor(config: SpreadsheetConversionConfig = {}) {
        this.configuration = this.normalizeConfiguration(config);
        this.performanceMonitor = new SpreadsheetPerformanceMonitor(
            this.configuration.performanceConfig
        );
        this.dataValidator = new SpreadsheetDataValidator(
            this.configuration.validationConfig
        );
    }

    /**
     * Convert spreadsheet input to JSON with comprehensive metadata
     * @param {SpreadsheetInput} input - File path, URL, or buffer data to convert
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result with data and metadata
     * @throws {Error} When input validation fails or conversion encounters an error
     * @since 0.2.6
     * @example
     * // Convert local file
     * const result = await converter.convertToJson('data.xlsx');
     * 
     * // Convert from URL
     * const result = await converter.convertToJson('https://example.com/data.csv');
     * 
     * // Convert buffer
     * const buffer = fs.readFileSync('data.xlsx');
     * const result = await converter.convertToJson(buffer);
     */
    public async convertToJson (input: SpreadsheetInput): Promise<SpreadsheetConversionResult> {
        this.performanceMonitor.reset();
        this.dataValidator.clearValidationErrors();

        try {
            // NOTE Validate input before processing
            const inputValidation = this.dataValidator.validateInput(input);
            if (!inputValidation.isValid) {
                const errorMessages = join(inputValidation.errors?.map(e => e.message) || [], ', ') || 'Unknown validation error';
                throw new Error(`Input validation failed: ${errorMessages}`);
            }

            // ANCHOR Get source information and prepare input
            const sourceInfo = InputProcessor.getSourceFileInfo(input);

            // NOTE Prepare input for processing
            const preparedInput = await InputProcessor.prepareInputForProcessing(input);

            // ANCHOR Determine processing strategy based on file size
            const shouldUseStreaming = this.performanceMonitor.shouldUseStreaming(sourceInfo.fileSizeBytes);

            let result: SpreadsheetConversionResult;

            if (shouldUseStreaming) {
                result = await this.processWithStreaming(preparedInput, sourceInfo);
            } else {
                result = await this.processStandard(preparedInput, sourceInfo);
            }

            // SECTION Generate performance metrics and finalize result
            const performanceMetrics = this.performanceMonitor.generatePerformanceMetrics();

            // NOTE Add additional metadata to result
            if (!result.metadata.performanceMetrics) {
                result.metadata.performanceMetrics = performanceMetrics;
            }
            if (!result.metadata.validationErrors) {
                result.metadata.validationErrors = this.dataValidator.getValidationErrors();
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Spreadsheet conversion failed: ${errorMessage}`);
        }
    }

    /**
     * Process files using standard approach for smaller datasets
     * @param {ArrayBuffer | string} preparedInput - Prepared input data (buffer or CSV content)
     * @param {SourceFileInfo} sourceInfo - Information about the source file
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result
     * @private
     * @since 0.2.6
     */
    private async processStandard (
        preparedInput: ArrayBuffer | string,
        sourceInfo: SourceFileInfo
    ): Promise<SpreadsheetConversionResult> {
        if (isString(preparedInput) && FileTypeDetector.isCsvContent(preparedInput)) {
            return await this.processCsvContent(preparedInput, sourceInfo);
        }
        return await this.processExcelWorkbook(preparedInput, sourceInfo);
    }

    /**
     * Process large files using streaming approach for better memory efficiency
     * @param {ArrayBuffer | string} preparedInput - Prepared input data (buffer or CSV content)
     * @param {SourceFileInfo} sourceInfo - Information about the source file
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result
     * @private
     * @since 0.2.6
     * @todo Implement full streaming functionality for large files
     */
    private async processWithStreaming (
        preparedInput: ArrayBuffer | string,
        sourceInfo: SourceFileInfo
    ): Promise<SpreadsheetConversionResult> {
        // TODO Streaming implementation is not yet complete
        // FIXME Fall back to standard processing for now
        return this.processStandard(preparedInput, sourceInfo);
    }

    /**
     * Process CSV content and convert to JSON format
     * @param {string} content - Raw CSV content string
     * @param {SourceFileInfo} sourceInfo - Information about the source file
     * @returns {Promise<SingleSheetConversionResult>} Promise resolving to single sheet conversion result
     * @private
     * @since 0.2.6
     */
    private async processCsvContent (
        content: string,
        sourceInfo: SourceFileInfo
    ): Promise<SingleSheetConversionResult> {
        const parser = new CsvParser(this.configuration.csvParsingOptions);
        const rawData = parser.parse(content);

        const processedData = await this.processDataThroughPipeline(rawData, CSV_SOURCE_NAME);

        const sheetInfo: ProcessedSheetInfo = {
            name: CSV_SOURCE_NAME,
            index: 0,
            rowCount: processedData.length,
            columnCount: processedData.length > 0 ? keys(processedData[0]).length : 0,
            processingTimeMs: Date.now() - this.performanceMonitor['startTime'].getTime()
        };

        return {
            data: processedData,
            metadata: {
                sourceFile: sourceInfo,
                sheetsProcessed: [sheetInfo],
                totalRows: processedData.length,
                totalSheets: 1,
                processingTimeMs: sheetInfo.processingTimeMs
            }
        };
    }

    /**
     * Process Excel workbook and convert all target sheets to JSON
     * @param {ArrayBuffer | string} preparedInput - Prepared Excel workbook data
     * @param {SourceFileInfo} sourceInfo - Information about the source file
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result (single or multi-sheet)
     * @private
     * @since 0.2.6
     */
    private async processExcelWorkbook (
        preparedInput: ArrayBuffer | string,
        sourceInfo: SourceFileInfo
    ): Promise<SpreadsheetConversionResult> {
        const parser = new ExcelParser();
        const workbook = parser.parseWorkbook(preparedInput);

        const availableSheets = workbook.SheetNames;
        const targetSheets = this.selectTargetSheets(availableSheets);

        if (isEmpty(targetSheets)) {
            throw new Error('No sheets found to process');
        }

        const processedSheets = await this.processSheetsWithConcurrency(workbook, targetSheets);

        const totalRows = reduce(processedSheets, (sum, sheet) => sum + sheet.data.length, 0);
        const totalProcessingTime = reduce(processedSheets, (sum, sheet) => sum + sheet.metadata.processingTimeMs, 0);

        const metadata: ConversionMetadata = {
            sourceFile: sourceInfo,
            sheetsProcessed: map(processedSheets, s => s.metadata),
            totalRows,
            totalSheets: processedSheets.length,
            processingTimeMs: totalProcessingTime
        };

        if (this.configuration.sheetSelection === SHEET_SELECTION.FIRST || processedSheets.length === 1) {
            return {
                data: processedSheets[0].data,
                metadata
            } as SingleSheetConversionResult;
        } else {
            const sheetData: Record<string, Record<string, any>[]> = {};
            processedSheets.forEach(sheet => {
                sheetData[sheet.metadata.name] = sheet.data;
            });

            return {
                data: sheetData,
                metadata
            } as MultiSheetConversionResult;
        }
    }

    /**
     * Process multiple sheets concurrently with controlled batch size
     * @param {XLSX.WorkBook} workbook - Excel workbook object
     * @param {string[]} targetSheets - Array of sheet names to process
     * @returns {Promise<ProcessedSheetResult[]>} Promise resolving to array of processed sheet results
     * @private
     * @since 0.2.6
     */
    private async processSheetsWithConcurrency (
        workbook: XLSX.WorkBook,
        targetSheets: string[]
    ): Promise<ProcessedSheetResult[]> {
        const concurrencyLimit = this.configuration.performanceConfig?.concurrencyLimit || 4;
        const results: ProcessedSheetResult[] = [];

        for (let i = 0; i < targetSheets.length; i += concurrencyLimit) {
            const batch = slice(targetSheets, i, i + concurrencyLimit);
            const batchPromises = map(batch, (sheetName, index) =>
                this.processWorksheetOptimized(workbook.Sheets[sheetName], sheetName, i + index)
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Process a single worksheet with performance optimizations
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet object
     * @param {string} sheetName - Name of the worksheet
     * @param {number} sheetIndex - Index of the worksheet
     * @returns {Promise<ProcessedSheetResult>} Promise resolving to processed sheet result with metadata
     * @private
     * @since 0.2.6
     */
    private async processWorksheetOptimized (
        worksheet: XLSX.WorkSheet,
        sheetName: string,
        sheetIndex: number
    ): Promise<ProcessedSheetResult> {
        const startTime = Date.now();
        const parser = new ExcelParser();

        const rawData = parser.parseWorksheet(worksheet, sheetName, this.configuration);
        const processedData = await this.processDataThroughPipeline(rawData, sheetName);

        const processingTime = Date.now() - startTime;

        const metadata: ProcessedSheetInfo = {
            name: sheetName,
            index: sheetIndex,
            rowCount: processedData.length,
            columnCount: processedData.length ? keys(processedData[0]).length : 0,
            processingTimeMs: processingTime
        };

        return {
            data: processedData,
            metadata
        };
    }

    /**
     * Process data through validation, cleaning, and transformation pipeline
     * @param {Record<string, any>[]} data - Raw data array from parsed worksheet
     * @param {string} sheetName - Name of the sheet being processed
     * @returns {Promise<Record<string, any>[]>} Promise resolving to processed and cleaned data array
     * @private
     * @since 0.2.6
     */
    private async processDataThroughPipeline (
        data: Record<string, any>[],
        sheetName: string
    ): Promise<Record<string, any>[]> {
        let processedData = [...data];

        // SECTION Apply data validation if enabled
        if (this.configuration.validationConfig?.enableTypeValidation) {
            processedData = filter(processedData, (row, index) => {
                const validation = this.dataValidator.validateRow(row, index, sheetName);
                return !!(validation.isValid || this.configuration.validationConfig?.continueOnValidationError);
            });
        }

        // ANCHOR Clean data using DataCleaner
        const cleaner = new DataCleaner();
        processedData = cleaner.cleanDataset(
            processedData,
            this.configuration.shouldSkipEmptyRows,
            this.configuration.shouldSkipEmptyColumns,
            this.configuration.shouldIgnoreIndexOnlyRows
        );

        // SECTION Apply transformations if configured
        if (this.configuration.headerTransformer || this.configuration.valueTransformer) {
            processedData = map(processedData, row => {
                const transformedRow: Record<string, any> = {};

                forEach(entries(row), ([header, value]) => {
                    const newHeader = this.configuration.headerTransformer
                        ? this.configuration.headerTransformer(header)
                        : header;
                    const newValue = this.configuration.valueTransformer
                        ? this.configuration.valueTransformer(value, newHeader)
                        : value;

                    transformedRow[newHeader] = newValue;
                });

                return transformedRow;
            });
        }

        // NOTE Create nested objects if requested
        if (this.configuration.shouldCreateNestedObjects) {
            const builder = new NestedObjectBuilder();
            processedData = builder.createNestedObjects(processedData);
        }

        return processedData;
    }

    /**
     * Select target sheets based on configuration settings
     * @param {string[]} availableSheets - Array of all available sheet names
     * @returns {string[]} Array of selected sheet names to process
     * @private
     * @since 0.2.6
     */
    private selectTargetSheets (availableSheets: string[]): string[] {
        const selection = this.configuration.sheetSelection;

        if (selection === SHEET_SELECTION.ALL) {
            return availableSheets;
        } else if (selection === SHEET_SELECTION.FIRST) {
            return slice(availableSheets, 0, 1);
        } else if (Array.isArray(selection)) {
            if (isString(selection[0])) {
                return filter(selection as string[], name => includes(availableSheets, name));
            } else {
                return map(
                    filter(selection as number[], index => index >= 0 && index < availableSheets.length),
                    index => availableSheets[index]
                );
            }
        }

        return slice(availableSheets, 0, 1);
    }

    /**
     * Normalize configuration with sensible defaults for all options
     * @param {SpreadsheetConversionConfig} config - User-provided configuration
     * @returns {Required<SpreadsheetConversionConfig>} Complete configuration with all defaults applied
     * @private
     * @since 0.2.6
     */
    private normalizeConfiguration (config: SpreadsheetConversionConfig): Required<SpreadsheetConversionConfig> {
        const defaultConfig = {
            sheetSelection: SHEET_SELECTION.FIRST,
            dateFormatPattern: DEFAULTS.DATE_FORMAT,
            shouldSkipEmptyRows: DEFAULTS.SKIP_EMPTY_ROWS,
            shouldSkipEmptyColumns: DEFAULTS.SKIP_EMPTY_COLUMNS,
            shouldIgnoreIndexOnlyRows: DEFAULTS.IGNORE_INDEX_ONLY_ROWS,
            headerTransformer: (header: string) => header,
            valueTransformer: (value: any) => value,
            hasHeaderRow: true,
            headerRowIndex: DEFAULTS.HEADER_ROW_INDEX,
            shouldIncludeSheetName: DEFAULTS.INCLUDE_SHEET_NAME,
            shouldParseFormulas: DEFAULTS.PARSE_FORMULAS,
            shouldCreateNestedObjects: DEFAULTS.CREATE_NESTED_OBJECTS,
            csvParsingOptions: {
                fieldDelimiter: ',',
                quoteCharacter: '"',
                escapeCharacter: '"',
                encoding: DEFAULTS.ENCODING,
                shouldTrimFields: true,
                commentCharacter: ''
            },
            performanceConfig: {
                batchSize: PERFORMANCE.DEFAULT_BATCH_SIZE,
                maxMemoryUsageMB: PERFORMANCE.MEMORY_THRESHOLD_MB,
                enableStreaming: false,
                streamingThresholdMB: PERFORMANCE.STREAMING_THRESHOLD_MB,
                concurrencyLimit: 4,
                enableProgressReporting: false,
                progressCallback: undefined,
                enableGarbageCollection: true,
                gcThresholdMB: PERFORMANCE.GC_THRESHOLD_MB
            },
            validationConfig: {
                enableTypeValidation: false,
                continueOnValidationError: true,
                maxValidationErrors: 100,
                collectValidationErrors: false,
                rowValidator: undefined,
                cellValidator: undefined
            }
        };

        return defaults(config, defaultConfig) as Required<SpreadsheetConversionConfig>;
    }
}
