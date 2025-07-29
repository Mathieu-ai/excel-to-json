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
    ProcessedSheetInfo,
    StreamingOptions
} from '../types';

import {
    SHEET_SELECTION,
    DEFAULTS,
    CSV_SOURCE_NAME,
    PERFORMANCE
} from '../constants';

import { SpreadsheetPerformanceMonitor, PerformanceOptimizer } from '../validators/performance-monitor';
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
                const errorMessages = join(
                    map(inputValidation.errors || [], e => e.message),
                    ', '
                ) || 'Unknown validation error';
                throw new Error(`Input validation failed: ${errorMessages}`);
            }

            // ANCHOR Get source information and prepare input
            const sourceInfo = InputProcessor.getSourceFileInfo(input);
            const preparedInput = await InputProcessor.prepareInputForProcessing(input);

            // ANCHOR Determine processing strategy and execute
            const shouldUseStreaming = this.performanceMonitor.shouldUseStreaming(sourceInfo.fileSizeBytes);
            const result = shouldUseStreaming
                ? await this.processWithStreamingInternal(preparedInput, sourceInfo)
                : await this.processStandard(preparedInput, sourceInfo);

            // SECTION Generate performance metrics and finalize result
            return this.finalizeResult(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Spreadsheet conversion failed: ${errorMessage}`);
        }
    }

    /**
     * Convert spreadsheet input to JSON using streaming approach for large files
     * @param {SpreadsheetInput} input - File path, URL, or buffer data to convert
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result with data and metadata
     * @throws {Error} When input validation fails or conversion encounters an error
     * @since 0.8.0
     * @example
     * // Convert large file with streaming
     * const result = await converter.processWithStreaming('large-data.xlsx', {
     *   batchSize: 1000,
     *   enableConcurrency: true
     * });
     */
    public async processWithStreaming (
        input: SpreadsheetInput,
        config: StreamingOptions = {}
    ): Promise<SpreadsheetConversionResult> {
        this.performanceMonitor.reset();
        this.dataValidator.clearValidationErrors();

        try {
            // NOTE Validate input before processing
            const inputValidation = this.dataValidator.validateInput(input);
            if (!inputValidation.isValid) {
                const errorMessages = join(
                    map(inputValidation.errors || [], e => e.message),
                    ', '
                ) || 'Unknown validation error';
                throw new Error(`Input validation failed: ${errorMessages}`);
            }

            // ANCHOR Get source information and prepare input
            const sourceInfo = InputProcessor.getSourceFileInfo(input);
            const preparedInput = await InputProcessor.prepareInputForProcessing(input);

            // ANCHOR Force streaming processing
            const result = await this.processWithStreamingInternal(preparedInput, sourceInfo, config);

            // SECTION Generate performance metrics and finalize result
            return this.finalizeResult(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Spreadsheet streaming conversion failed: ${errorMessage}`);
        }
    }

    /**
     * Finalize conversion result with metadata
     * @param {SpreadsheetConversionResult} result - Base conversion result
     * @returns {SpreadsheetConversionResult} Finalized result with complete metadata
     * @private
     * @since 0.8.0
     */
    private finalizeResult (result: SpreadsheetConversionResult): SpreadsheetConversionResult {
        const performanceMetrics = this.performanceMonitor.generatePerformanceMetrics();
        const validationErrors = this.dataValidator.getValidationErrors();

        return {
            ...result,
            metadata: {
                ...result.metadata,
                performanceMetrics: result.metadata.performanceMetrics || performanceMetrics,
                validationErrors: result.metadata.validationErrors || validationErrors
            }
        };
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
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result
     * @private
     * @since 0.8.0
     */
    private async processWithStreamingInternal (
        preparedInput: ArrayBuffer | string,
        sourceInfo: SourceFileInfo,
        config: StreamingOptions = {}
    ): Promise<SpreadsheetConversionResult> {
        // NOTE: Determine file type and route to appropriate streaming processor
        switch (true) {
            case isString(preparedInput) && FileTypeDetector.isCsvContent(preparedInput):
                return await this.processCsvContentWithStreaming(preparedInput, sourceInfo, config);
            case !isString(preparedInput):
                return await this.processExcelWorkbookWithStreaming(preparedInput, sourceInfo, config);
            default:
                // FIXME: Fall back to standard processing for unknown types
                return this.processStandard(preparedInput, sourceInfo);
        }
    }

    /**
     * Process CSV content using streaming for large datasets
     * @param {string} content - Raw CSV content string
     * @param {SourceFileInfo} sourceInfo - Information about the source file
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<SingleSheetConversionResult>} Promise resolving to single sheet conversion result
     * @private
     * @since 0.8.0
     */
    private async processCsvContentWithStreaming (
        content: string,
        sourceInfo: SourceFileInfo,
        config: StreamingOptions = {}
    ): Promise<SingleSheetConversionResult> {
        const parser = new CsvParser(this.configuration.csvParsingOptions);
        const batchSize = config.batchSize || this.performanceMonitor.getOptimalBatchSize(PERFORMANCE.DEFAULT_STREAMING_BATCH_SIZE);

        // NOTE: Split content into manageable chunks for streaming processing
        const lines = content.split('\n');
        const headerLine = lines[0];
        const dataLines = slice(lines, 1);

        if (isEmpty(dataLines)) {
            return this.createEmptyResult(sourceInfo);
        }

        // Process data in batches to manage memory usage
        const processedData = await this.processDataInBatches(
            dataLines,
            headerLine,
            parser,
            batchSize,
            CSV_SOURCE_NAME
        );

        return this.createSingleSheetResult(processedData, sourceInfo, CSV_SOURCE_NAME);
    }

    /**
     * Process Excel workbook using streaming for large datasets 
     * @param {ArrayBuffer | string} preparedInput - Prepared Excel workbook data
     * @param {SourceFileInfo} sourceInfo - Information about the source file
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<SpreadsheetConversionResult>} Promise resolving to conversion result
     * @private
     * @since 0.8.0
     */
    private async processExcelWorkbookWithStreaming (
        preparedInput: ArrayBuffer | string,
        sourceInfo: SourceFileInfo,
        config: StreamingOptions = {}
    ): Promise<SpreadsheetConversionResult> {
        const parser = new ExcelParser();
        const workbook = parser.parseWorkbook(preparedInput);

        const availableSheets = workbook.SheetNames;
        const targetSheets = this.selectTargetSheets(availableSheets);

        if (isEmpty(targetSheets)) {
            throw new Error('No sheets found to process');
        }

        // Process sheets with streaming approach
        const processedSheets = await this.processSheetsWithStreamingConcurrency(workbook, targetSheets, config);

        const { totalRows, totalProcessingTime } = reduce(
            processedSheets,
            (acc, sheet) => ({
                totalRows: acc.totalRows + sheet.data.length,
                totalProcessingTime: acc.totalProcessingTime + sheet.metadata.processingTimeMs
            }),
            { totalRows: 0, totalProcessingTime: 0 }
        );

        const metadata: ConversionMetadata = {
            sourceFile: sourceInfo,
            sheetsProcessed: map(processedSheets, s => s.metadata),
            totalRows,
            totalSheets: processedSheets.length,
            processingTimeMs: totalProcessingTime,
            streamingUsed: true
        };

        return this.createConversionResult(processedSheets, metadata);
    }

    /**
     * Process data in batches for streaming large CSV datasets
     * @param {string[]} dataLines - Array of CSV data lines
     * @param {string} headerLine - CSV header line
     * @param {CsvParser} parser - CSV parser instance
     * @param {number} batchSize - Batch size for processing
     * @param {string} sheetName - Sheet name for processing
     * @returns {Promise<Record<string, any>[]>} Processed data
     * @private
     * @since 0.8.0
     */
    private async processDataInBatches (
        dataLines: string[],
        headerLine: string,
        parser: CsvParser,
        batchSize: number,
        sheetName: string
    ): Promise<Record<string, any>[]> {
        const processedData: Record<string, any>[] = [];

        await PerformanceOptimizer.processBatches(
            dataLines,
            async (batch: string[]) => {
                // Reconstruct CSV content for each batch
                const batchContent = [headerLine, ...batch].join('\n');
                const batchData = parser.parse(batchContent);

                // Process through pipeline
                const processedBatch = await this.processDataThroughPipeline(batchData, sheetName);
                processedData.push(...processedBatch);

                return processedBatch;
            },
            batchSize,
            this.performanceMonitor
        );

        return processedData;
    }

    /**
     * Create empty result for cases with no data
     * @param {SourceFileInfo} sourceInfo - Source file information
     * @returns {SingleSheetConversionResult} Empty single sheet result
     * @private
     * @since 0.8.0
     */
    private createEmptyResult (sourceInfo: SourceFileInfo): SingleSheetConversionResult {
        const sheetInfo: ProcessedSheetInfo = {
            name: CSV_SOURCE_NAME,
            index: 0,
            rowCount: 0,
            columnCount: 0,
            processingTimeMs: 0
        };

        return {
            data: [],
            metadata: {
                sourceFile: sourceInfo,
                sheetsProcessed: [sheetInfo],
                totalRows: 0,
                totalSheets: 1,
                processingTimeMs: 0,
                streamingUsed: true
            }
        };
    }

    /**
     * Create single sheet result with metadata
     * @param {Record<string, any>[]} processedData - Processed data
     * @param {SourceFileInfo} sourceInfo - Source file information  
     * @param {string} sheetName - Sheet name
     * @returns {SingleSheetConversionResult} Single sheet conversion result
     * @private
     * @since 0.8.0
     */
    private createSingleSheetResult (
        processedData: Record<string, any>[],
        sourceInfo: SourceFileInfo,
        sheetName: string
    ): SingleSheetConversionResult {
        const sheetInfo: ProcessedSheetInfo = {
            name: sheetName,
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
                processingTimeMs: sheetInfo.processingTimeMs,
                streamingUsed: true
            }
        };
    }

    /**
     * Process multiple sheets with streaming concurrency control
     * @param {XLSX.WorkBook} workbook - Excel workbook object
     * @param {string[]} targetSheets - Array of sheet names to process
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<ProcessedSheetResult[]>} Promise resolving to array of processed sheet results
     * @private
     * @since 0.8.0
     */
    private async processSheetsWithStreamingConcurrency (
        workbook: XLSX.WorkBook,
        targetSheets: string[],
        config: StreamingOptions = {}
    ): Promise<ProcessedSheetResult[]> {
        const concurrencyLimit = Math.min(
            config.maxConcurrency || this.configuration.performanceConfig?.concurrencyLimit || 2,
            2 // Limit concurrency for streaming to manage memory
        );

        const results: ProcessedSheetResult[] = [];

        // Process sheets in smaller batches for streaming
        for (let i = 0; i < targetSheets.length; i += concurrencyLimit) {
            const batch = slice(targetSheets, i, i + concurrencyLimit);
            const batchPromises = map(batch, (sheetName, index) =>
                this.processWorksheetWithStreaming(workbook.Sheets[sheetName], sheetName, i + index, config)
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Allow memory cleanup between batches
            this.performanceMonitor.checkMemoryUsageAndOptimize();
        }

        return results;
    }

    /**
     * Process a single worksheet with streaming optimizations
     * @param {XLSX.WorkSheet} worksheet - Excel worksheet object
     * @param {string} sheetName - Name of the worksheet
     * @param {number} sheetIndex - Index of the worksheet
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<ProcessedSheetResult>} Promise resolving to processed sheet result with metadata
     * @private
     * @since 0.8.0
     */
    private async processWorksheetWithStreaming (
        worksheet: XLSX.WorkSheet,
        sheetName: string,
        sheetIndex: number,
        config: StreamingOptions = {}
    ): Promise<ProcessedSheetResult> {
        const startTime = Date.now();
        const parser = new ExcelParser();

        // Parse worksheet data
        const rawData = parser.parseWorksheet(worksheet, sheetName, this.configuration);

        // Process data through pipeline with streaming optimizations
        const processedData = await this.processDataThroughStreamingPipeline(rawData, sheetName, config);

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
     * Process data through streaming pipeline with memory optimizations
     * @param {Record<string, any>[]} data - Raw data array from parsed worksheet
     * @param {string} sheetName - Name of the sheet being processed
     * @param {StreamingOptions} [config] - Streaming configuration options
     * @returns {Promise<Record<string, any>[]>} Promise resolving to processed and cleaned data array
     * @private
     * @since 0.8.0
     */
    private async processDataThroughStreamingPipeline (
        data: Record<string, any>[],
        sheetName: string,
        config: StreamingOptions = {}
    ): Promise<Record<string, any>[]> {
        const batchSize = config.batchSize || this.performanceMonitor.getOptimalBatchSize(PERFORMANCE.DEFAULT_STREAMING_BATCH_SIZE);
        let processedData: Record<string, any>[] = [];

        // Process data in batches to manage memory
        await PerformanceOptimizer.processBatches(
            data,
            async (batch: Record<string, any>[]) => {
                const batchResult = await this.processDataThroughPipeline(batch, sheetName);
                processedData.push(...batchResult);
                return batchResult;
            },
            batchSize,
            this.performanceMonitor
        );

        return processedData;
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
                processingTimeMs: sheetInfo.processingTimeMs,
                streamingUsed: false
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

        const { totalRows, totalProcessingTime } = reduce(
            processedSheets,
            (acc, sheet) => ({
                totalRows: acc.totalRows + sheet.data.length,
                totalProcessingTime: acc.totalProcessingTime + sheet.metadata.processingTimeMs
            }),
            { totalRows: 0, totalProcessingTime: 0 }
        );

        const metadata: ConversionMetadata = {
            sourceFile: sourceInfo,
            sheetsProcessed: map(processedSheets, s => s.metadata),
            totalRows,
            totalSheets: processedSheets.length,
            processingTimeMs: totalProcessingTime,
            streamingUsed: false
        };

        return this.createConversionResult(processedSheets, metadata);
    }

    /**
     * Create appropriate conversion result based on sheet selection
     * @param {ProcessedSheetResult[]} processedSheets - Processed sheet results
     * @param {ConversionMetadata} metadata - Conversion metadata
     * @returns {SpreadsheetConversionResult} Appropriate conversion result type
     * @private
     * @since 0.8.0
     */
    private createConversionResult (
        processedSheets: ProcessedSheetResult[],
        metadata: ConversionMetadata
    ): SpreadsheetConversionResult {
        const isSingleSheet = this.configuration.sheetSelection === SHEET_SELECTION.FIRST || processedSheets.length === 1;

        if (isSingleSheet) {
            return {
                data: processedSheets[0].data,
                metadata
            } as SingleSheetConversionResult;
        }

        const sheetData = reduce(
            processedSheets,
            (result: Record<string, Record<string, any>[]>, sheet: ProcessedSheetResult) => {
                result[sheet.metadata.name] = sheet.data;
                return result;
            },
            {}
        );

        return {
            data: sheetData,
            metadata
        } as MultiSheetConversionResult;
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
            processedData = reduce(
                processedData,
                (result: Record<string, any>[], row: Record<string, any>, index: number) => {
                    const validation = this.dataValidator.validateRow(row, index, sheetName);
                    if (validation.isValid || this.configuration.validationConfig?.continueOnValidationError) {
                        result.push(row);
                    }
                    return result;
                },
                []
            );
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
        const hasCustomTransformers = this.hasCustomTransformers();
        if (hasCustomTransformers) {
            processedData = reduce(
                processedData,
                (result: Record<string, any>[], row: Record<string, any>) => {
                    const transformedRow = this.transformRowData(row);
                    result.push(transformedRow);
                    return result;
                },
                []
            );
        }

        // NOTE Create nested objects if requested
        if (this.configuration.shouldCreateNestedObjects) {
            const builder = new NestedObjectBuilder();
            processedData = builder.createNestedObjects(processedData);
        }

        return processedData;
    }

    /**
     * Transform row data using configured transformers
     * @param {Record<string, any>} row - Row data to transform
     * @returns {Record<string, any>} Transformed row data
     * @private
     * @since 0.8.0
     */
    private transformRowData (row: Record<string, any>): Record<string, any> {
        return reduce(
            entries(row),
            (result: Record<string, any>, [header, value]: [string, any]) => {
                const newHeader = this.configuration.headerTransformer
                    ? this.configuration.headerTransformer(header)
                    : header;
                const newValue = this.configuration.valueTransformer
                    ? this.configuration.valueTransformer(value, newHeader)
                    : value;

                result[newHeader] = newValue;
                return result;
            },
            {}
        );
    }

    /**
     * Check if custom transformers are configured (different from defaults)
     * @returns {boolean} True if custom transformers are configured
     * @private
     * @since 0.8.0
     */
    private hasCustomTransformers (): boolean {
        const defaultHeaderTransformer = (header: string) => header;
        const defaultValueTransformer = (value: any) => value;

        return (
            this.configuration.headerTransformer.toString() !== defaultHeaderTransformer.toString() ||
            this.configuration.valueTransformer.toString() !== defaultValueTransformer.toString()
        );
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

        switch (true) {
            case selection === SHEET_SELECTION.ALL:
                return availableSheets;

            case selection === SHEET_SELECTION.FIRST:
                return slice(availableSheets, 0, 1);

            case Array.isArray(selection):
                return this.processArraySelection(selection as string[] | number[], availableSheets);

            default:
                return slice(availableSheets, 0, 1);
        }
    }

    /**
     * Process array-based sheet selection (by name or index)
     * @param {string[] | number[]} selection - Array of sheet names or indices
     * @param {string[]} availableSheets - Available sheet names
     * @returns {string[]} Selected sheet names
     * @private
     * @since 0.8.0
     */
    private processArraySelection (selection: string[] | number[], availableSheets: string[]): string[] {
        return isString(selection[0])
            ? filter(selection as string[], name => includes(availableSheets, name))
            : reduce(
                filter(selection as number[], index => index >= 0 && index < availableSheets.length),
                (result: string[], index: number) => {
                    result.push(availableSheets[index]);
                    return result;
                },
                []
            );
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
