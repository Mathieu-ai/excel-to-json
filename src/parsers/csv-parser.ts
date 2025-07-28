import { CsvParsingConfiguration } from '../types';
import {
    CSV_DELIMITERS,
    CSV_QUOTE_CHARS,
    CSV_BOOLEAN_VALUES,
    DEFAULTS
} from '../constants';
import {
    isEmpty,
    isString,
    trim,
    split,
    filter,
    map,
    slice,
    includes,
    startsWith,
    isNumber,
    toLowerCase,
    reduce,
    isNaN,
    defaults,
    some,
    parseFloat
} from 'generic-functions.mlai';

// ANCHOR Enhanced CSV parser with better performance and error handling capabilities
export class CsvParser {
    private configuration: Required<CsvParsingConfiguration>;

    /**
     * Create a new CSV parser instance
     * @param {CsvParsingConfiguration} [config={}] - CSV parsing configuration
     * @param {string} [config.fieldDelimiter] - Field delimiter character (auto-detected if not provided)
     * @param {string} [config.quoteCharacter='"'] - Quote character for escaping fields
     * @param {boolean} [config.shouldTrimFields=true] - Whether to trim whitespace from fields
     * @returns {CsvParser} CsvParser instance
     * @since 0.2.6
     * @example
     * const parser = new CsvParser({ fieldDelimiter: ';' });
     */
    constructor(config: CsvParsingConfiguration = {}) {
        this.configuration = this.normalizeConfiguration(config);
    }

    /**
     * Parse CSV content with enhanced error handling and intelligent type inference
     * @param {string} content - Raw CSV content string to parse
     * @returns {Record<string, any>[]} Array of row objects parsed from CSV
     * @throws {Error} When invalid CSV content is provided
     * @since 0.2.6
     * @example
     * const data = parser.parse('name,age\nJohn,30\nJane,25');
     * console.log(data); // [{ name: 'John', age: '30' }, { name: 'Jane', age: '25' }]
     */
    public parse (content: string): Record<string, any>[] {
        if (isEmpty(content) || !isString(content)) {
            throw new Error('Invalid CSV content provided');
        }

        // NOTE Auto-detect delimiter if not specified for better compatibility
        if (!this.configuration.fieldDelimiter) {
            this.configuration.fieldDelimiter = this.detectOptimalDelimiter(content);
        }

        return this.parseCsvInternal(content, this.configuration);
    }

    /**
     * Intelligent CSV delimiter detection with improved accuracy and fallback options
     * @param {string} content - CSV content to analyze for delimiter detection
     * @returns {string} Best detected delimiter character
     * @since 0.2.6
     */
    public detectOptimalDelimiter (content: string): string {
        const commonDelimiters = [',', ';', '\t', '|'];
        const sampleLines = filter(slice(split(content, '\n'), 0, 10), line => !isEmpty(trim(line)));

        if (sampleLines.length < 2) return ','; // NOTE Default fallback

        let bestDelimiter = ',';
        let bestScore = 0;

        for (const delimiter of commonDelimiters) {
            const score = this.calculateDelimiterScore(sampleLines, delimiter);
            if (score > bestScore) {
                bestScore = score;
                bestDelimiter = delimiter;
            }
        }

        return bestDelimiter;
    }

    /**
     * Calculate score for delimiter effectiveness.
     * @param {string[]} lines - Lines to analyze
     * @param {string} delimiter - Delimiter to score
     * @returns {number} Score for delimiter
     */
    private calculateDelimiterScore (lines: string[], delimiter: string): number {
        const fieldCounts = map(lines, line => this.countFieldsInLine(line, delimiter));

        if (fieldCounts.length < 2) return 0;

        // NOTE Consistency score (lower variance is better)
        const mean = reduce(fieldCounts, (sum, count) => sum + count, 0) / fieldCounts.length;
        const variance = reduce(fieldCounts, (sum, count) => sum + Math.pow(count - mean, 2), 0) / fieldCounts.length;
        const consistencyScore = mean > 1 ? Math.max(0, 1 - (variance / mean)) : 0;

        // NOTE Field count score (more fields generally better)
        const fieldCountScore = Math.min(1, mean / 5);

        return (consistencyScore * 0.7) + (fieldCountScore * 0.3);
    }

    /**
     * Count fields in a line, handling quoted content.
     * @param {string} line - Line to count fields in
     * @param {string} delimiter - Delimiter to use
     * @returns {number} Number of fields
     */
    private countFieldsInLine (line: string, delimiter: string): number {
        let count = 1;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === this.configuration.quoteCharacter) {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                count++;
            }
        }

        return count;
    }

    /**
     * Normalize CSV configuration with defaults.
     * @param {CsvParsingConfiguration} options - Options to normalize
     * @returns {Required<CsvParsingConfiguration>} Normalized configuration
     */
    private normalizeConfiguration (options: CsvParsingConfiguration): Required<CsvParsingConfiguration> {
        return defaults(options, {
            fieldDelimiter: '',
            quoteCharacter: CSV_QUOTE_CHARS.DOUBLE_QUOTE,
            escapeCharacter: CSV_QUOTE_CHARS.DOUBLE_QUOTE,
            encoding: DEFAULTS.ENCODING,
            shouldTrimFields: true,
            commentCharacter: ''
        }) as Required<CsvParsingConfiguration>;
    }

    /**
     * Internal CSV parsing implementation.
     * @param {string} content - CSV content
     * @param {Required<CsvParsingConfiguration>} config - Normalized configuration
     * @returns {Record<string, any>[]} Parsed rows
     */
    private parseCsvInternal (
        content: string,
        config: Required<CsvParsingConfiguration>
    ): Record<string, any>[] {
        const { fieldDelimiter, quoteCharacter, escapeCharacter, shouldTrimFields, commentCharacter } = config;

        const lines = filter(split(content, '\n'), line => {
            const trimmed = trim(line);
            return trimmed.length > 0 && (!commentCharacter || !startsWith(trimmed, commentCharacter));
        });

        if (isEmpty(lines)) return [];

        // NOTE Parse header row
        const headers = this.parseLineFields(lines[0], fieldDelimiter, quoteCharacter, escapeCharacter, shouldTrimFields);

        // NOTE Parse data rows
        const result: Record<string, any>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const fields = this.parseLineFields(lines[i], fieldDelimiter, quoteCharacter, escapeCharacter, shouldTrimFields);
            const row: Record<string, any> = {};

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                const value = j < fields.length ? fields[j] : '';
                row[header] = this.inferAndConvertType(value);
            }

            result.push(row);
        }

        return result;
    }

    /**
     * Parse fields from a CSV line with proper quote handling.
     * @param {string} line - Line to parse
     * @param {string} delimiter - Field delimiter
     * @param {string} quoteChar - Quote character
     * @param {string} escapeChar - Escape character
     * @param {boolean} shouldTrim - Whether to trim fields
     * @returns {string[]} Parsed fields
     */
    private parseLineFields (
        line: string,
        delimiter: string,
        quoteChar: string,
        escapeChar: string,
        shouldTrim: boolean
    ): string[] {
        const fields: string[] = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = i + 1 < line.length ? line[i + 1] : '';

            if (char === escapeChar && nextChar === quoteChar && inQuotes) {
                currentField += quoteChar;
                i += 2; // NOTE Skip escaped quote
            } else if (char === quoteChar) {
                inQuotes = !inQuotes;
                i++;
            } else if (char === delimiter && !inQuotes) {
                fields.push(shouldTrim ? trim(currentField) : currentField);
                currentField = '';
                i++;
            } else {
                currentField += char;
                i++;
            }
        }

        // NOTE Add final field
        fields.push(shouldTrim ? trim(currentField) : currentField);

        return fields;
    }

    /**
     * Infer and convert data types from string values.
     * @param {string} value - Value to infer and convert
     * @returns {any} Converted value
     */
    private inferAndConvertType (value: string): any {
        const trimmedValue = trim(value);

        if (isEmpty(trimmedValue)) return null;

        // NOTE Boolean detection
        if (CSV_BOOLEAN_VALUES.ALL_BOOLEAN_VALUES.includes(toLowerCase(trimmedValue) as typeof CSV_BOOLEAN_VALUES.ALL_BOOLEAN_VALUES[number])) {
            return CSV_BOOLEAN_VALUES.TRUE_VALUES.includes(toLowerCase(trimmedValue) as typeof CSV_BOOLEAN_VALUES.TRUE_VALUES[number]);
        }

        // NOTE Number detection
        if (!isNaN(Number(trimmedValue)) && trimmedValue !== '') {
            const num = Number(trimmedValue);
            return isNumber(num) && Number.isInteger(num) ? num : parseFloat(trimmedValue);
        }

        // NOTE Date detection (basic heuristic)
        if (this.looksLikeDate(trimmedValue)) {
            const dateValue = new Date(trimmedValue);
            if (!isNaN(dateValue.getTime())) {
                return dateValue;
            }
        }

        return trimmedValue;
    }

    /**
     * Simple heuristic to detect date-like strings.
     * @param {string} value - Value to check
     * @returns {boolean} True if value looks like a date
     */
    private looksLikeDate (value: string): boolean {
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
            /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
            /^\d{1,2}\/\d{1,2}\/\d{4}$/ // M/D/YYYY
        ];

        return some(datePatterns, pattern => pattern.test(value));
    }
}
