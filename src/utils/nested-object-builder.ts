import {
    isEmpty,
    some,
    map,
    forEach,
    entries,
    split,
    isObject,
    isNull,
    keys,
    parseInt
} from 'generic-functions.mlai';

import { NUMERIC_PATTERNS } from '../constants';

// ANCHOR (File Scope)

/**
 * Enhanced nested object creation with performance optimizations.
 * @since 0.8.0
 */
export class NestedObjectBuilder {
    /**
     * Convert flat objects with dot-notation keys to nested structures.
     * Optimized for large datasets with caching and efficient processing.
     * @param {Record<string, any>[]} data - Array of flat objects to convert
     * @returns {Record<string, any>[]} Array of nested objects
     * @since 0.8.0
     * @example
     * // { 'a.b': 1, c: 2 } => { a: { b: 1 }, c: 2 }
     * createNestedObjects([{ 'a.b': 1, c: 2 }])
     */
    public createNestedObjects (data: Record<string, any>[]): Record<string, any>[] {
        if (isEmpty(data)) return data;

        // NOTE (File Scope): Analyze first row to determine processing strategy
        const sampleRow = data[0];
        const hasDotNotationKeys = some(keys(sampleRow), key => key.includes('.'));

        if (!hasDotNotationKeys) {
            return data; // NOTE (File Scope): No nested objects needed
        }

        // NOTE (File Scope): Process with optimizations
        return map(data, row => this.processRowForNesting(row));
    }

    /**
     * Process a single row for nested object creation.
     * @param {Record<string, any>} row - The flat object row to process
     * @returns {Record<string, any>} Nested object
     * @since 0.8.0
     */
    private processRowForNesting (row: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {};

        forEach(entries(row), ([key, value]) => {
            if (key.includes('.')) {
                const path = split(key, '.');
                this.setNestedValue(result, path, value);
            } else {
                result[key] = value;
            }
        });

        return result;
    }

    /**
     * Set nested value in object structure.
     * Handles both object properties and array indices.
     * @param {Record<string, any>} obj - The object to set value in
     * @param {string[]} path - Array of keys representing the path
     * @param {any} value - Value to set
     * @returns {void}
     * @since 0.8.0
     */
    private setNestedValue (obj: Record<string, any>, path: string[], value: any): void {
        let current = obj;

        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            const nextKey = path[i + 1];

            // Check if next key is a numeric index (for arrays)
            const isNextKeyNumeric = NUMERIC_PATTERNS.NUMERIC_INDEX_REGEX.test(nextKey);

            if (!(key in current) || (!isObject(current[key]) && !Array.isArray(current[key])) || isNull(current[key])) {
                current[key] = isNextKeyNumeric ? [] : {};
            }
            current = current[key];
        }

        const lastKey = path[path.length - 1];

        // If the last key is numeric and current is an array, treat as array index
        if (NUMERIC_PATTERNS.NUMERIC_INDEX_REGEX.test(lastKey) && Array.isArray(current)) {
            const index = parseInt(lastKey);
            current[index] = value;
        } else {
            current[lastKey] = value;
        }
    }
}
