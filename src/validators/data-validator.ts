import {
    SpreadsheetInput,
    ValidationConfiguration,
    ValidationResult,
    ValidationError
} from '../types';
import {
    VALIDATION,
    NETWORK,
    ERROR_MESSAGES
} from '../constants';
import {
    isString,
    isNumber,
    isBoolean,
    isDate,
    isFunction,
    isObject,
    trim,
    toLowerCase,
    startsWith,
    includes,
    some,
    entries,
    join
} from 'generic-functions.mlai';

// ANCHOR (File Scope)

/**
 * Comprehensive data validation utilities for spreadsheet processing.
 * Provides type validation, data integrity checks, and error collection.
 * @since 0.8.0
 */
export class SpreadsheetDataValidator {
    private readonly configuration: Required<ValidationConfiguration>;
    private validationErrors: ValidationError[] = [];
    private errorCount: number = 0;

    constructor(config: ValidationConfiguration = {}) {
        this.configuration = this.normalizeConfiguration(config);
    }

    /**
     * Validate input before processing begins.
     * @param {SpreadsheetInput} input - The spreadsheet input to validate
     * @returns {ValidationResult} Validation result object
     * @since 0.8.0
     */
    public validateInput (input: SpreadsheetInput): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        if (!input) {
            errors.push(this.createValidationError('Input', -1, 'Input cannot be null or undefined', input));
            return { isValid: false, errors };
        }

        // NOTE (File Scope): Use switch pattern for input type validation
        switch (true) {
            case isString(input):
                this.validateStringInput(input as string, errors);
                break;
            case Buffer.isBuffer(input):
            case input instanceof ArrayBuffer:
            case input instanceof Uint8Array:
                this.validateBufferInput(input, errors);
                break;
            default:
                errors.push(this.createValidationError('Input', -1, 'Unsupported input type', input));
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Validate string input (URL or file path)
     * @param {string} input - String input to validate
     * @param {ValidationError[]} errors - Errors array to populate
     * @private
     * @since 0.8.0
     */
    private validateStringInput (input: string, errors: ValidationError[]): void {
        const trimmedInput = trim(input);

        if (trimmedInput.length === 0) {
            errors.push(this.createValidationError('Input', -1, 'File path or URL cannot be empty', input));
            return;
        }

        if (this.isUrl(input)) {
            if (!this.isValidUrl(input)) {
                errors.push(this.createValidationError('Input', -1, 'Invalid URL format', input));
            }
        } else if (this.hasInvalidPathCharacters(input)) {
            errors.push(this.createValidationError('Input', -1, 'File path contains invalid characters', input));
        }
    }

    /**
     * Validate buffer input
     * @param {SpreadsheetInput} input - Buffer input to validate
     * @param {ValidationError[]} errors - Errors array to populate
     * @private
     * @since 0.8.0
     */
    private validateBufferInput (input: SpreadsheetInput, errors: ValidationError[]): void {
        const length = this.getBufferLength(input);

        if (length === 0) {
            errors.push(this.createValidationError('Input', -1, 'Input buffer is empty', input));
        }
    }

    /**
     * Get buffer length for different buffer types
     * @param {SpreadsheetInput} input - Buffer input
     * @returns {number} Buffer length
     * @private
     * @since 0.8.0
     */
    private getBufferLength (input: SpreadsheetInput): number {
        switch (true) {
            case Buffer.isBuffer(input):
                return (input as Buffer).length;
            case input instanceof ArrayBuffer:
                return input.byteLength;
            case input instanceof Uint8Array:
                return input.length;
            default:
                return 0;
        }
    }

    /**
     * Validate a single row of data according to configuration.
     * @param {Record<string, any>} row - The row data to validate
     * @param {number} rowIndex - The index of the row
     * @param {string} [sheetName='Unknown'] - The name of the sheet
     * @returns {ValidationResult} Validation result object
     * @since 0.8.0
     */
    public validateRow (
        row: Record<string, any>,
        rowIndex: number,
        sheetName: string = VALIDATION.DEFAULT_SHEET_NAME
    ): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        if (!row || !isObject(row)) {
            errors.push(this.createValidationError(sheetName, rowIndex, 'Row must be a valid object', row));
            return { isValid: false, errors };
        }

        // NOTE (File Scope): Apply validation pipeline
        this.applyCustomRowValidation(row, rowIndex, sheetName, errors, warnings);
        this.applyCellLevelValidation(row, rowIndex, sheetName, errors, warnings);

        // NOTE (File Scope): Collect errors if configured
        if (this.configuration.collectValidationErrors) {
            this.validationErrors.push(...errors);
            this.errorCount += errors.length;
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Apply custom row validation if configured
     * @param {Record<string, any>} row - Row data
     * @param {number} rowIndex - Row index
     * @param {string} sheetName - Sheet name
     * @param {ValidationError[]} errors - Errors array
     * @param {string[]} warnings - Warnings array
     * @private
     * @since 0.8.0
     */
    private applyCustomRowValidation (
        row: Record<string, any>,
        rowIndex: number,
        sheetName: string,
        errors: ValidationError[],
        warnings: string[]
    ): void {
        if (!isFunction(this.configuration.rowValidator)) return;

        try {
            const customResult = this.configuration.rowValidator(row, rowIndex);
            if (!customResult.isValid && customResult.errors) {
                errors.push(...customResult.errors);
            }
            if (customResult.warnings) {
                warnings.push(...customResult.warnings);
            }
        } catch (error) {
            errors.push(this.createValidationError(
                sheetName,
                rowIndex,
                `Row validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                row
            ));
        }
    }

    /**
     * Apply cell-level validation using reduce pattern
     * @param {Record<string, any>} row - Row data
     * @param {number} rowIndex - Row index
     * @param {string} sheetName - Sheet name
     * @param {ValidationError[]} errors - Errors array
     * @param {string[]} warnings - Warnings array
     * @private
     * @since 0.8.0
     */
    private applyCellLevelValidation (
        row: Record<string, any>,
        rowIndex: number,
        sheetName: string,
        errors: ValidationError[],
        warnings: string[]
    ): void {
        if (!isFunction(this.configuration.cellValidator)) return;

        entries(row).reduce(
            (acc, [columnName, value]) => {
                try {
                    const cellValidation = this.configuration.cellValidator!(value, columnName, rowIndex);
                    if (!cellValidation.isValid && cellValidation.errors) {
                        acc.errors.push(...cellValidation.errors);
                    }
                    if (cellValidation.warnings) {
                        acc.warnings.push(...cellValidation.warnings);
                    }
                } catch (error) {
                    acc.errors.push(this.createValidationError(
                        sheetName,
                        rowIndex,
                        `Cell validation error for ${columnName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        value,
                        columnName
                    ));
                }
                return acc;
            },
            { errors, warnings }
        );
    }

    /**
     * Validate data types and format of individual cell values.
     * @param {*} value - The cell value to validate
     * @param {string} columnName - The column name
     * @param {number} rowIndex - The row index
     * @returns {ValidationResult} Validation result object
     * @since 0.8.0
     */
    public validateCellValue (
        value: any,
        columnName: string,
        rowIndex: number
    ): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        // NOTE (File Scope): Check for suspicious content
        if (isString(value) && this.containsSuspiciousContent(value)) {
            warnings.push(`Potentially suspicious content detected in ${columnName}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Validate column headers for consistency and best practices.
     * @param {string[]} headers - The array of header names
     * @returns {ValidationResult} Validation result object
     * @since 0.8.0
     */
    public validateHeaders (headers: string[]): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        if (!headers || !Array.isArray(headers)) {
            errors.push(this.createValidationError('Headers', -1, 'Headers must be a valid array', headers));
            return { isValid: false, errors };
        }

        // NOTE (File Scope): Check for duplicate headers
        const seen = new Set<string>();
        const duplicates = new Set<string>();

        headers.forEach((header, index) => {
            if (seen.has(header)) {
                duplicates.add(header);
            }
            seen.add(header);

            if (this.hasProblematicHeaderName(header)) {
                warnings.push(`Header "${header}" might cause issues`);
            }
        });

        if (duplicates.size > 0) {
            warnings.push(`Duplicate headers found: ${join(Array.from(duplicates), ', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Get all collected validation errors.
     * @returns {ValidationError[]} Array of collected validation errors
     * @since 0.8.0
     */
    public getValidationErrors (): ValidationError[] {
        return [...this.validationErrors];
    }

    /**
     * Clear collected validation errors.
     * @since 0.8.0
     */
    public clearValidationErrors (): void {
        this.validationErrors = [];
        this.errorCount = 0;
    }

    /**
     * Check if maximum error limit has been reached.
     * @returns {boolean} True if error limit exceeded, otherwise false
     * @since 0.8.0
     */
    public hasExceededErrorLimit (): boolean {
        return this.errorCount >= this.configuration.maxValidationErrors;
    }

    /**
     * Create type-safe validators for common data types.
     * @returns {Object} Object containing type validator functions
     * @since 0.8.0
     */
    public static createTypeValidators () {
        return {
            string: (value: any) => isString(value),
            number: (value: any) => isNumber(value) && !isNaN(value),
            boolean: (value: any) => isBoolean(value),
            date: (value: any) => isDate(value) && !isNaN(value.getTime()),
            email: (value: any) => isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            url: (value: any) => isString(value) && /^https?:\/\/[^\s]+$/.test(value)
        };
    }

    /**
     * Create a validation error object.
     * @param {string} sheetName - The sheet name
     * @param {number} rowIndex - The row index
     * @param {string} message - The error message
     * @param {*} [invalidValue] - The invalid value
     * @param {string} [columnName] - The column name
     * @returns {ValidationError} Validation error object
     * @since 0.8.0
     */
    private createValidationError (
        sheetName: string,
        rowIndex: number,
        message: string,
        invalidValue?: any,
        columnName?: string
    ): ValidationError {
        return {
            sheetName,
            rowIndex,
            columnName,
            message,
            severity: 'error' as const,
            invalidValue
        };
    }

    /**
     * Normalize validation configuration with defaults.
     * @param {ValidationConfiguration} config - The validation configuration
     * @returns {Required<ValidationConfiguration>} Normalized configuration
     * @since 0.8.0
     */
    private normalizeConfiguration (config: ValidationConfiguration): Required<ValidationConfiguration> {
        return {
            enableTypeValidation: config.enableTypeValidation ?? false,
            continueOnValidationError: config.continueOnValidationError ?? true,
            maxValidationErrors: config.maxValidationErrors || 100,
            collectValidationErrors: config.collectValidationErrors ?? false,
            rowValidator: config.rowValidator || ((row, index) => ({ isValid: true })),
            cellValidator: config.cellValidator || ((value, column, index) => ({ isValid: true }))
        };
    }

    /**
     * Check if a string is a URL.
     * @param {string} input - The input string
     * @returns {boolean} True if input is a URL, otherwise false
     * @since 0.8.0
     */
    private isUrl (input: string): boolean {
        // Quick check for Windows file paths (avoid treating them as URLs)
        if (/^[a-zA-Z]:\\/.test(input)) {
            return false;
        }

        try {
            const url = new URL(input);
            // Only consider http/https as URLs for our purposes
            return includes([NETWORK.PROTOCOLS.HTTP, NETWORK.PROTOCOLS.HTTPS], url.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Validate URL format.
     * @param {string} url - The URL string
     * @returns {boolean} True if valid URL, otherwise false
     * @since 0.8.0
     */
    private isValidUrl (url: string): boolean {
        try {
            const parsed = new URL(url);
            return includes([NETWORK.PROTOCOLS.HTTP, NETWORK.PROTOCOLS.HTTPS], parsed.protocol)
        } catch {
            return false;
        }
    }

    /**
     * Check for invalid file path characters.
     * @param {string} path - The file path
     * @returns {boolean} True if invalid characters found, otherwise false
     * @since 0.8.0
     */
    private hasInvalidPathCharacters (path: string): boolean {
        // More permissive validation for Windows and Unix file paths
        // Only check for truly problematic characters
        const invalidChars = /[<>"|?*]/;

        // Skip validation if it looks like a valid Windows path
        if (/^[a-zA-Z]:\\/.test(path)) {
            return false;
        }

        // Skip validation if it looks like a Unix/relative path
        if (startsWith(path, VALIDATION.PATH_TRAVERSAL_PATTERNS[0]) ||
            startsWith(path, VALIDATION.PATH_TRAVERSAL_PATTERNS[1]) ||
            startsWith(path, VALIDATION.PATH_TRAVERSAL_PATTERNS[2])) {
            return false;
        }

        return invalidChars.test(path);
    }

    /**
     * Check for potentially suspicious content.
     * @param {string} value - The string value to check
     * @returns {boolean} True if suspicious content found, otherwise false
     * @since 0.8.0
     */
    private containsSuspiciousContent (value: string): boolean {
        return VALIDATION.SUSPICIOUS_PATTERNS.some(pattern => value.toLowerCase().includes(pattern));
    }

    /**
     * Check if header name might cause issues.
     * @param {string} header - The header name
     * @returns {boolean} True if problematic, otherwise false
     * @since 0.8.0
     */
    private hasProblematicHeaderName (header: string): boolean {
        const allProblematicNames = [
            ...VALIDATION.PROBLEMATIC_HEADERS,
            'eval', 'function', 'toString', 'valueOf', 'hasOwnProperty'
        ];

        return includes(allProblematicNames, toLowerCase(header)) ||
            includes(header, '.') ||
            includes(header, ' ') ||
            /^\d/.test(header); // starts with number
    }
}

/**
 * Schema-based validation utilities.
 * @since 0.8.0
 */
export class SchemaValidator {
    /**
     * Create a schema validator function.
     * @param {Record<string, any>} schema - The schema definition
     * @returns {(row: Record<string, any>, rowIndex: number) => ValidationResult} Validator function
     * @since 0.8.0
     */
    public static createSchemaValidator (schema: Record<string, any>) {
        return (row: Record<string, any>, rowIndex: number): ValidationResult => {
            const errors: ValidationError[] = [];

            entries(schema).forEach(([field, expectedType]) => {
                const value = row[field];

                if (value !== undefined && value !== null) {
                    if (!SchemaValidator.validateType(value, expectedType)) {
                        errors.push({
                            sheetName: 'Validation',
                            rowIndex,
                            columnName: field,
                            message: `Expected ${expectedType} but got ${typeof value}`,
                            severity: 'error',
                            invalidValue: value
                        });
                    }
                }
            });

            return {
                isValid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };
        };
    }

    /**
     * Validate a value against an expected type.
     * @param {*} value - The value to validate
     * @param {string} expectedType - The expected type
     * @returns {boolean} True if value matches type, otherwise false
     * @since 0.8.0
     */
    private static validateType (value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'string': return isString(value);
            case 'number': return isNumber(value) && !isNaN(value);
            case 'boolean': return isBoolean(value);
            case 'date': return value instanceof Date && !isNaN(value.getTime());
            default: return true;
        }
    }
}
