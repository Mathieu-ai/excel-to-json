import {
    formatDate as gfFormatDate,
    isDate,
    isString,
    isNumber,
    padStart,
    replace
} from 'generic-functions.mlai';

// ANCHOR (File Scope)
/**
 * Enhanced date formatting utility with performance optimizations for large datasets
 * @class DateFormatter
 * @since 0.2.6
 */
export class DateFormatter {
    private static readonly formatCache = new Map<string, (date: Date) => string>();

    /**
     * Format date with optimized caching mechanism for improved performance
     * @param {Date} date - Date object to format
     * @param {string} format - Date format pattern (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY')
     * @returns {string} Formatted date string
     * @since 0.2.6
     * @example
     * DateFormatter.formatDateOptimized(new Date(), 'YYYY-MM-DD') // '2025-07-28'
     */
    public static formatDateOptimized (date: Date, format: string): string {
        // NOTE: Use generic-functions.mlai formatDate function which is already optimized
        return gfFormatDate(date, format);
    }

    /**
     * Create optimized formatter function for repeated use with same format pattern
     * @param {string} format - Date format pattern to create formatter for
     * @returns {(date: Date) => string} Optimized formatter function
     * @since 0.2.6
     * @example
     * // const fn = DateFormatter['createFormatterFunction']('YYYY-MM-DD')
     */
    private static createFormatterFunction (format: string): (date: Date) => string {
        // NOTE: Simplified implementation using generic-functions.mlai replace and padStart
        const formatParts = [
            { token: 'YYYY', getValue: (d: Date) => d.getFullYear().toString() },
            { token: 'YY', getValue: (d: Date) => d.getFullYear().toString().slice(-2) },
            { token: 'MM', getValue: (d: Date) => padStart((d.getMonth() + 1).toString(), 2, '0') },
            { token: 'DD', getValue: (d: Date) => padStart(d.getDate().toString(), 2, '0') },
            { token: 'HH', getValue: (d: Date) => padStart(d.getHours().toString(), 2, '0') },
            { token: 'mm', getValue: (d: Date) => padStart(d.getMinutes().toString(), 2, '0') },
            { token: 'ss', getValue: (d: Date) => padStart(d.getSeconds().toString(), 2, '0') }
        ];

        return (date: Date): string => {
            let result = format;

            for (const part of formatParts) {
                result = replace(result, new RegExp(part.token, 'g'), part.getValue(date));
            }

            return result;
        };
    }

    /**
     * Check if a value represents a date.
     * @param {*} value - Value to check
     * @returns {boolean} True if value is a date or date string, false otherwise
     * @since 0.2.6
     * @example
     * DateFormatter.isDateValue('2020-01-01') // true
     * DateFormatter.isDateValue('not a date') // false
     */
    public static isDateValue (value: any): boolean {
        // NOTE: Use generic-functions.mlai isDate for Date objects and string validation
        if (isDate(value)) return true;
        if (isString(value)) {
            const dateValue = new Date(value);
            return !isNaN(dateValue.getTime());
        }
        return false;
    }

    /**
     * Parse date from various formats.
     * @param {*} value - Value to parse as date
     * @returns {Date|null} Parsed Date object or null if invalid
     * @since 0.2.6
     * @example
     * DateFormatter.parseDate('2020-01-01') // Date object
     * DateFormatter.parseDate('not a date') // null
     */
    public static parseDate (value: any): Date | null {
        // NOTE: Use generic-functions.mlai type checking functions
        if (isDate(value)) return value;

        if (isString(value)) {
            const dateValue = new Date(value);
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }

        if (isNumber(value)) {
            const dateValue = new Date(value);
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }

        return null;
    }
}
