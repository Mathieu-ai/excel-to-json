import { includes } from 'generic-functions.mlai';
import {
    NETWORK,
    GOOGLE_SHEETS,
    URL_PATTERNS,
    ERROR_MESSAGES
} from '../constants';

// ANCHOR (File Scope)
/**
 * Enhanced URL and network utilities with retry logic and better error handling.
 * @since 0.8.0
 */

/**
 * NetworkHandler provides static methods for URL validation, Google Sheets normalization,
 * and robust file fetching with retry logic.
 * @since 0.8.0
 */
export class NetworkHandler {
    private static readonly MAX_RETRIES = NETWORK.MAX_RETRIES;
    private static readonly RETRY_DELAY_MS = NETWORK.RETRY_DELAY_MS;

    /**
     * Check if a string is a valid URL.
     * @param {string} input - The string to validate as a URL
     * @returns {boolean} True if the input is a valid HTTP or HTTPS URL, false otherwise
     * @since 0.8.0
     * @example
     * NetworkHandler.isValidUrl('https://example.com') // true
     * NetworkHandler.isValidUrl('not-a-url') // false
     */
    public static isValidUrl (input: string): boolean {
        try {
            const url = new URL(input);
            return includes([NETWORK.PROTOCOLS.HTTP, NETWORK.PROTOCOLS.HTTPS], url.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Fetch file from URL with retry logic and comprehensive error handling.
     * @param {string} url - The URL to fetch the file from
     * @param {number} [retries=NetworkHandler.MAX_RETRIES] - Number of retry attempts
     * @returns {Promise<ArrayBuffer>} The fetched file as an ArrayBuffer
     * @throws {Error} If fetching fails after all retries
     * @since 0.8.0
     * @example
     * await NetworkHandler.fetchFileWithRetry('https://example.com/file.xlsx')
     */
    public static async fetchFileWithRetry (
        url: string,
        retries: number = this.MAX_RETRIES
    ): Promise<ArrayBuffer> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(ERROR_MESSAGES.HTTP_ERROR.replace('{status}', response.status.toString()).replace('{statusText}', response.statusText));
                }

                return await response.arrayBuffer();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;

                if (attempt === retries) {
                    throw new Error(ERROR_MESSAGES.FAILED_TO_FETCH.replace('{url}', url).replace('{retries}', retries.toString()).replace('{error}', errorMessage));
                }

                // NOTE (File Scope): Silent retry - avoid console warnings during normal operation
                await this.delay(this.RETRY_DELAY_MS * attempt); // Exponential backoff
            }
        }

        throw new Error(ERROR_MESSAGES.FAILED_TO_FETCH_SIMPLE.replace('{url}', url));
    }

    /**
     * Check if URL is a Google Sheets URL and convert to export format if needed.
     * @param {string} url - The URL to normalize
     * @returns {string} The normalized Google Sheets export URL or the original URL
     * @since 0.8.0
     * @example
     * NetworkHandler.normalizeGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/abc123/edit')
     * // 'https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx'
     */
    public static normalizeGoogleSheetsUrl (url: string): string {
        const match = url.match(URL_PATTERNS.GOOGLE_SHEETS_REGEX);

        if (match) {
            const spreadsheetId = match[1];
            return GOOGLE_SHEETS.EXPORT_URL_TEMPLATE.replace('{id}', spreadsheetId);
        }

        return url;
    }

    /**
     * Delay utility for retry logic.
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>} Promise that resolves after the delay
     * @since 0.8.0
     * @example
     * await NetworkHandler.delay(1000)
     */
    private static delay (ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
