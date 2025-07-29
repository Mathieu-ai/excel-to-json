import { SpreadsheetInput } from '../types';
import {
    FILE_TYPES,
    FILE_SIGNATURES,
    URL_PATTERNS,
    CSV_DELIMITERS
} from '../constants';
import {
    isString,
    split,
    slice,
    filter,
    some,
    isEmpty,
    trim,
    map,
    reduce
} from 'generic-functions.mlai';

/**
 * Intelligent file type detection utility for spreadsheet files
 * @class FileTypeDetector
 * @description More reliable than extension-only detection for large-scale processing
 * @since 0.2.6
 */
export class FileTypeDetector {
    /**
     * Detect if the input content is CSV format based on content analysis
     * @param {string} input - Input string to analyze
     * @returns {boolean} True if content appears to be CSV format
     * @since 0.2.6
     * @example
     * FileTypeDetector.isCsvContent('name,age\nJohn,30') // true
     */
    public static isCsvContent (input: string): boolean {
        if (!isString(input)) return false;

        // NOTE Check if it looks like a file path rather than content
        if (this.isFilePath(input)) return false;

        // ANCHOR Analyze content pattern for CSV characteristics
        return this.analyzeCsvContentPattern(input);
    }

    /**
     * Detect file type based on binary content signature analysis
     * @param {ArrayBuffer} buffer - Binary file content to analyze
     * @returns {FILE_TYPES.XLSX | FILE_TYPES.XLS | FILE_TYPES.UNKNOWN} Detected file type
     * @since 0.2.6
     * @example
     * FileTypeDetector.detectFileTypeFromBuffer(buffer) // FILE_TYPES.XLSX
     */
    public static detectFileTypeFromBuffer (buffer: ArrayBuffer): typeof FILE_TYPES.XLSX | typeof FILE_TYPES.XLS | typeof FILE_TYPES.UNKNOWN {
        const bytes = new Uint8Array(buffer);

        // NOTE XLSX signature detection (ZIP format)
        if (this.matchesSignature(bytes, FILE_SIGNATURES.XLSX_ZIP)) {
            return FILE_TYPES.XLSX;
        }

        // NOTE XLS signature
        if (this.matchesSignature(bytes, FILE_SIGNATURES.XLS_OLE)) {
            return FILE_TYPES.XLS;
        }

        return FILE_TYPES.UNKNOWN;
    }

    /**
     * Check if string appears to be a file path rather than content.
     * @param {string} input - Input string to check
     * @returns {boolean} True if input looks like a file path
     * @since 0.2.6
     */
    private static isFilePath (input: string): boolean {
        const patterns = [
            { test: () => URL_PATTERNS.FILE_EXTENSION_REGEX.test(input), description: 'file extension' },
            { test: () => URL_PATTERNS.PATH_REGEX.test(input), description: 'path pattern' },
            { test: () => /^https?:\/\//i.test(input), description: 'URL pattern' }
        ];

        return some(patterns, pattern => pattern.test());
    }

    /**
     * Analyze content pattern to determine if it's CSV.
     * @param {string} content - Content string to analyze
     * @returns {boolean} True if content appears to be CSV
     * @since 0.2.6
     */
    private static analyzeCsvContentPattern (content: string): boolean {
        const lines = slice(split(content, '\n'), 0, 10); // NOTE Check first 10 lines
        if (lines.length < 2) return false;

        // ANCHOR Try common delimiters using reduce for better performance
        const commonDelimiters = [',', ';', '\t', '|'];

        return reduce(
            commonDelimiters,
            (found: boolean, delimiter: string) => {
                if (found) return true; // Short-circuit if already found

                const consistency = this.calculateDelimiterConsistency(lines, delimiter);
                const hasMultipleColumns = this.hasMultipleColumns(lines, delimiter);

                return consistency > 0.8 && hasMultipleColumns;
            },
            false
        );
    }

    /**
     * Calculate how consistently a delimiter appears across lines.
     * @param {string[]} lines - Lines to analyze
     * @param {string} delimiter - Delimiter to check
     * @returns {number} Consistency score (0-1)
     * @since 0.2.6
     */
    private static calculateDelimiterConsistency (lines: string[], delimiter: string): number {
        const fieldCounts = map(
            filter(lines, line => !isEmpty(trim(line))),
            line => this.countFieldsInLine(line, delimiter)
        );

        if (fieldCounts.length < 2) return 0;

        const mean = reduce(fieldCounts, (sum, count) => sum + count, 0) / fieldCounts.length;
        const variance = reduce(fieldCounts, (sum, count) => sum + Math.pow(count - mean, 2), 0) / fieldCounts.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;

        return Math.max(0, 1 - coefficientOfVariation);
    }

    /**
     * Check if lines have multiple columns when split by delimiter.
     * @param {string[]} lines - Lines to check
     * @param {string} delimiter - Delimiter to use
     * @returns {boolean} True if any line has multiple columns
     * @since 0.2.6
     */
    private static hasMultipleColumns (lines: string[], delimiter: string): boolean {
        return some(lines, line => this.countFieldsInLine(line, delimiter) > 1);
    }

    /**
     * Count fields in a line considering quoted content.
     * @param {string} line - Line to analyze
     * @param {string} delimiter - Delimiter to use
     * @returns {number} Number of fields in the line
     * @since 0.2.6
     */
    private static countFieldsInLine (line: string, delimiter: string): number {
        let count = 1;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                count++;
            }
        }

        return count;
    }

    /**
     * Check if byte array matches a signature.
     * @param {Uint8Array} bytes - Byte array to check
     * @param {readonly number[]} signature - Signature to match
     * @returns {boolean} True if signature matches
     * @since 0.2.6
     */
    private static matchesSignature (bytes: Uint8Array, signature: readonly number[]): boolean {
        if (bytes.length < signature.length) return false;

        for (let i = 0; i < signature.length; i++) {
            if (bytes[i] !== signature[i]) return false;
        }

        return true;
    }
}
