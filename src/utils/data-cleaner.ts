import {
    isEmpty,
    isString,
    trim,
    filter,
    forEach,
    some,
    keys,
    values,
    entries,
    map
} from 'generic-functions.mlai';

// ANCHOR (File Scope)
/**
 * Enhanced data cleaning utilities with performance optimizations.
 */
export class DataCleaner {
    /**
     * Clean dataset by removing empty rows and columns
     * @param {Record<string, any>[]} data - The dataset to clean
     * @param {boolean} skipEmptyRows - Whether to remove empty rows
     * @param {boolean} skipEmptyColumns - Whether to remove empty columns
     * @param {boolean} ignoreIndexOnlyRows - Whether to ignore index-only rows when determining if a row is empty
     * @returns {Record<string, any>[]} Cleaned dataset
     * @since 0.8.0
     * @example
     * cleanDataset([{a: 1, b: ''}, {a: '', b: ''}], true, true, true) // [{a: 1}]
     */
    public cleanDataset (
        data: Record<string, any>[],
        skipEmptyRows: boolean,
        skipEmptyColumns: boolean,
        ignoreIndexOnlyRows: boolean = true
    ): Record<string, any>[] {
        if (data.length === 0) return data;

        let cleanedData = [...data];

        // NOTE (File Scope): Remove empty rows if requested
        if (skipEmptyRows) {
            cleanedData = filter(cleanedData, row => this.hasNonEmptyValue(row, ignoreIndexOnlyRows));
        }

        // NOTE (File Scope): Remove empty columns if requested
        if (skipEmptyColumns && cleanedData.length > 0) {
            const emptyColumns = this.identifyEmptyColumns(cleanedData);
            if (emptyColumns.length > 0) {
                cleanedData = map(cleanedData, row => {
                    const cleanedRow: Record<string, any> = {};
                    forEach(entries(row), ([key, value]) => {
                        if (!emptyColumns.includes(key)) {
                            cleanedRow[key] = value;
                        }
                    });
                    return cleanedRow;
                });
            }
        }

        return cleanedData;
    }

    /**
     * Check if a row has any non-empty values
     * @param {Record<string, any>} row - The row to check
     * @param {boolean} ignoreIndexOnlyRows - Whether to ignore index-only rows
     * @returns {boolean} True if the row has at least one non-empty value
     * @since 0.8.0
     * @example
     * hasNonEmptyValue({a: '', b: 1}) // true
     * hasNonEmptyValue({a: '', b: ''}) // false
     * hasNonEmptyValue({'1': 5, name: null, age: null}, true) // false (only index column has data)
     */
    private hasNonEmptyValue (row: Record<string, any>, ignoreIndexOnlyRows: boolean = true): boolean {
        // Get all non-empty values
        const nonEmptyValues = entries(row).filter(([key, value]) =>
            value !== null &&
            value !== undefined &&
            value !== '' &&
            (!isString(value) || trim(value) !== '')
        );

        // If no non-empty values, row is empty
        if (!nonEmptyValues.length) {
            return false;
        }

        // If only one non-empty value and it's likely an index column, consider row empty
        if (ignoreIndexOnlyRows && nonEmptyValues.length === 1) {
            const [key, value] = nonEmptyValues[0];

            // Check if this looks like an index/sequential column
            if (this.isLikelyIndexColumn(key, value)) {
                return false;
            }
        } return true;
    }

    /**
     * Determine if a column key and value pair represents an index/sequential column
     * that shouldn't count as meaningful data when determining if a row is empty
     * @param {string} key - The column key
     * @param {any} value - The column value
     * @returns {boolean} True if this appears to be an index column
     * @since 0.8.0
     * @example
     * isLikelyIndexColumn('1', 5) // true
     * isLikelyIndexColumn('id', 5) // false (id is meaningful)
     * isLikelyIndexColumn('name', 'John') // false
     */
    private isLikelyIndexColumn (key: string, value: any): boolean {
        // Column keys that are just numbers (like '1', '2', 'A', 'B' from Excel)
        const isNumericKey = /^[0-9]+$/.test(key);
        const isSingleLetterKey = /^[A-Z]$/.test(key);

        // Value should be numeric for it to be considered an index
        const isNumericValue = typeof value === 'number' && Number.isInteger(value) && value > 0;

        // Additional check: common index column names
        const commonIndexNames = ['index', 'row', 'rownum', 'rownumber', '#'];
        const isCommonIndexName = commonIndexNames.includes(key.toLowerCase());

        return (isNumericKey || isSingleLetterKey || isCommonIndexName) && isNumericValue;
    }

    /**
     * Identify columns that are completely empty across all rows
     * @param {Record<string, any>[]} data - The dataset to analyze
     * @returns {string[]} Array of column keys that are empty in all rows
     * @since 0.8.0
     * @example
     * identifyEmptyColumns([{a: '', b: 1}, {a: '', b: 2}]) // ['a']
     */
    private identifyEmptyColumns (data: Record<string, any>[]): string[] {
        if (isEmpty(data)) return [];

        const allKeys = new Set<string>();
        forEach(data, row => {
            forEach(keys(row), key => allKeys.add(key));
        });

        const emptyColumns: string[] = [];

        forEach(Array.from(allKeys), key => {
            const hasNonEmptyValue = some(data, row => {
                const value = row[key];
                return value !== null &&
                    value !== undefined &&
                    value !== '' &&
                    (!isString(value) || trim(value) !== '');
            });

            if (!hasNonEmptyValue) {
                emptyColumns.push(key);
            }
        });

        return emptyColumns;
    }
}
