import {
    formatDate as gfFormatDate,
    isDate,
    isString,
    isNumber,
} from 'generic-functions.mlai';

// ANCHOR (File Scope)
/**
 * Enhanced date formatting utility with performance optimizations for large datasets
 * @class DateFormatter
 * @since 0.2.6
 */
export class DateFormatter {
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
        if (isDate(value)) return value;
        if (!isNumber(value) || !isString(value)) return null;
        const dateValue = new Date(value);
        return isNaN(dateValue.getTime()) ? null : dateValue;
    }
}
