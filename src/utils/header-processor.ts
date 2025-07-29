import {
    removeBreakLines,
    trim,
    toLowerCase,
    replace,
    isEmpty,
    isString,
    now,
    uniqueId,
    reduce
} from 'generic-functions.mlai';

import {
    HEADER_CONSTANTS,
    DATE_FORMATS
} from '../constants';

/**
 * Enhanced header processing with better naming and optimization.
 * @since 0.8.0
 */
export class HeaderProcessor {
    /**
     * Apply intelligent header transformation with fallback strategies.
     * Optimized for large datasets with consistent processing.
     * @param {string} header - The header string to transform
     * @returns {string} Transformed header string
     * @since 0.8.0
     * @example
     * HeaderProcessor.transformHeaderWithFallback('  Name\n') // 'Name'
     */
    public static transformHeaderWithFallback (header: string): string {
        if (!header || !isString(header)) {
            return `${HEADER_CONSTANTS.COLUMN_PREFIX}${now(DATE_FORMATS.DATETIME_ISO)}_${uniqueId()}`;
        }

        // NOTE (File Scope): Primary transformation: clean and normalize
        let processed = removeBreakLines(trim(header));

        // NOTE (File Scope): Fallback transformations
        if (isEmpty(processed)) {
            processed = `${HEADER_CONSTANTS.EMPTY_HEADER_PREFIX}${uniqueId()}`;
        }

        return processed;
    }

    /**
     * Normalize header names for consistent processing.
     * Useful for large-scale data integration scenarios.
     * @param {string} header - The header string to normalize
     * @returns {string} Normalized header string
     * @since 0.8.0
     * @example
     * HeaderProcessor.normalizeHeaderForProcessing('First Name!') // 'first_name'
     */
    public static normalizeHeaderForProcessing (header: string): string {
        return replace(
            replace(
                replace(
                    replace(
                        trim(toLowerCase(header)),
                        HEADER_CONSTANTS.SPECIAL_CHARS_REGEX, HEADER_CONSTANTS.REPLACEMENT_CHAR
                    ),
                    HEADER_CONSTANTS.SPACES_REGEX, HEADER_CONSTANTS.REPLACEMENT_CHAR
                ),
                HEADER_CONSTANTS.MULTIPLE_UNDERSCORES_REGEX, HEADER_CONSTANTS.REPLACEMENT_CHAR
            ),
            HEADER_CONSTANTS.LEADING_TRAILING_UNDERSCORES_REGEX, ''
        );
    }

    /**
     * Generate unique headers when duplicates are detected.
     * @param {string[]} headers - Array of header strings
     * @returns {string[]} Array of unique header strings
     * @since 0.8.0
     * @example
     * HeaderProcessor.ensureUniqueHeaders(['a', 'b', 'a']) // ['a', 'b', 'a_1']
     */
    public static ensureUniqueHeaders (headers: string[]): string[] {
        const { result } = reduce(
            headers,
            (acc: { seen: Map<string, number>; result: string[] }, header: string) => {
                const normalizedHeader = this.normalizeHeaderForProcessing(header);
                const count = acc.seen.get(normalizedHeader) || 0;
                acc.seen.set(normalizedHeader, count + 1);

                const uniqueHeader = count === 0 ? header : `${header}_${count}`;
                acc.result.push(uniqueHeader);

                return acc;
            },
            { seen: new Map<string, number>(), result: [] as string[] }
        );

        return result;
    }
}
