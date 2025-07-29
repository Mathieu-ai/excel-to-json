import {
    reduce,
    filter,
    entries,
    isString,
    trim,
    some,
    includes
} from 'generic-functions.mlai';

/**
 * Common utility patterns using generic-functions.mlai for consistent and optimized operations.
 * Centralizes frequently used patterns to reduce code duplication and improve maintainability.
 * @since 0.8.0
 */
export class CommonPatterns {
    /**
     * Find best option from a list based on scoring function using reduce pattern
     * @template T
     * @param {T[]} options - Array of options to evaluate
     * @param {(option: T) => number} scoringFn - Function to score each option
     * @param {T} defaultOption - Default option if no best score found
     * @returns {T} Best scoring option
     */
    static findBestOption<T> (options: T[], scoringFn: (option: T) => number, defaultOption: T): T {
        const { best } = reduce(
            options,
            (acc: { best: T; bestScore: number }, option: T) => {
                const score = scoringFn(option);
                return score > acc.bestScore ? { best: option, bestScore: score } : acc;
            },
            { best: defaultOption, bestScore: 0 }
        );
        return best;
    }

    /**
     * Transform objects using reduce pattern for better performance than map + forEach
     * @template T, R
     * @param {T[]} items - Array of items to transform
     * @param {(item: T) => R} transformer - Transformation function
     * @returns {R[]} Array of transformed items
     */
    static transformWithReduce<T, R> (items: T[], transformer: (item: T) => R): R[] {
        return reduce(
            items,
            (result: R[], item: T) => {
                result.push(transformer(item));
                return result;
            },
            [] as R[]
        );
    }

    /**
     * Filter and transform in single pass using reduce
     * @template T, R
     * @param {T[]} items - Array of items to process
     * @param {(item: T) => boolean} predicate - Filter predicate
     * @param {(item: T) => R} transformer - Transformation function
     * @returns {R[]} Filtered and transformed array
     */
    static filterAndTransform<T, R> (
        items: T[],
        predicate: (item: T) => boolean,
        transformer: (item: T) => R
    ): R[] {
        return reduce(
            items,
            (result: R[], item: T) => {
                if (predicate(item)) {
                    result.push(transformer(item));
                }
                return result;
            },
            [] as R[]
        );
    }

    /**
     * Check if a value is non-empty using consistent logic
     * @param {any} value - Value to check
     * @returns {boolean} True if value is non-empty
     */
    static isNonEmptyValue (value: any): boolean {
        return value !== null &&
            value !== undefined &&
            value !== '' &&
            (!isString(value) || trim(value) !== '');
    }

    /**
     * Get non-empty entries from an object
     * @param {Record<string, any>} obj - Object to process
     * @returns {Array<[string, any]>} Array of non-empty key-value pairs
     */
    static getNonEmptyEntries (obj: Record<string, any>): Array<[string, any]> {
        return filter(entries(obj), ([, value]) => this.isNonEmptyValue(value));
    }

    /**
     * Transform object entries using reduce pattern
     * @template R
     * @param {Record<string, any>} obj - Source object
     * @param {(key: string, value: any) => [string, any]} transformer - Key-value transformer
     * @returns {Record<string, any>} Transformed object
     */
    static transformObjectEntries (
        obj: Record<string, any>,
        transformer: (key: string, value: any) => [string, any]
    ): Record<string, any> {
        return reduce(
            entries(obj),
            (result: Record<string, any>, [key, value]: [string, any]) => {
                const [newKey, newValue] = transformer(key, value);
                result[newKey] = newValue;
                return result;
            },
            {} as Record<string, any>
        );
    }

    /**
     * Check if array contains any of the specified values using optimized lookup
     * @template T
     * @param {T[]} array - Array to search in
     * @param {T[]} values - Values to look for
     * @returns {boolean} True if any value found
     */
    static containsAny<T> (array: T[], values: T[]): boolean {
        return some(values, value => includes(array, value));
    }

    /**
     * Group array elements by a key function using reduce
     * @template T, K
     * @param {T[]} items - Items to group
     * @param {(item: T) => K} keyFn - Function to extract grouping key
     * @returns {Map<K, T[]>} Map of grouped items
     */
    static groupBy<T, K> (items: T[], keyFn: (item: T) => K): Map<K, T[]> {
        return reduce(
            items,
            (groups: Map<K, T[]>, item: T) => {
                const key = keyFn(item);
                const group = groups.get(key) || [];
                group.push(item);
                groups.set(key, group);
                return groups;
            },
            new Map<K, T[]>()
        );
    }

    /**
     * Create a frequency map using reduce
     * @template T
     * @param {T[]} items - Items to count
     * @returns {Map<T, number>} Frequency map
     */
    static createFrequencyMap<T> (items: T[]): Map<T, number> {
        return reduce(
            items,
            (freq: Map<T, number>, item: T) => {
                freq.set(item, (freq.get(item) || 0) + 1);
                return freq;
            },
            new Map<T, number>()
        );
    }
}
