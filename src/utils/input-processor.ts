import { SpreadsheetInput, SourceFileInfo } from '../types';
import { NetworkHandler } from './network-handler';
import { FileTypeDetector } from './file-type-detector';
import {
    FILE_TYPES,
    FILE_EXTENSIONS,
    ERROR_MESSAGES
} from '../constants';
import {
    isString,
    toLowerCase,
    endsWith
} from 'generic-functions.mlai';

// ANCHOR (File Scope)

/**
 * Enhanced input preparation with better error handling and type detection.
 * @since 0.8.0
 */
export class InputProcessor {
    /**
     * Prepare various input types for processing.
     * @param {SpreadsheetInput} input - The input to prepare
     * @returns {Promise<ArrayBuffer | string>} The prepared input as ArrayBuffer or string
     * @since 0.8.0
     */
    public static async prepareInputForProcessing (input: SpreadsheetInput): Promise<ArrayBuffer | string> {
        if (isString(input)) {
            if (NetworkHandler.isValidUrl(input)) {
                return await NetworkHandler.fetchFileWithRetry(input);
            } else if (this.isFilePath(input)) {
                const fs = await import('fs');
                const buffer = fs.readFileSync(input);
                return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
            } else {
                // NOTE (File Scope): Assume it's content
                return input;
            }
        } else if (input instanceof ArrayBuffer) {
            return input;
        } else if (Buffer.isBuffer(input)) {
            return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
        } else if (input instanceof Uint8Array) {
            return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
        } else {
            throw new Error(ERROR_MESSAGES.UNSUPPORTED_INPUT_TYPE);
        }
    }

    /**
     * Get comprehensive source file information.
     * @param {SpreadsheetInput} input - The input to analyze
     * @returns {SourceFileInfo} Information about the source file
     * @since 0.8.0
     */
    public static getSourceFileInfo (input: SpreadsheetInput): SourceFileInfo {
        const info: SourceFileInfo = {
            fileType: FILE_TYPES.BUFFER,
            source: 'unknown'
        };

        if (isString(input)) {
            info.source = input;

            if (NetworkHandler.isValidUrl(input)) {
                info.fileType = FILE_TYPES.URL;
            } else if (endsWith(toLowerCase(input), FILE_EXTENSIONS.CSV)) {
                info.fileType = FILE_TYPES.CSV;
            } else if (endsWith(toLowerCase(input), FILE_EXTENSIONS.XLSX)) {
                info.fileType = FILE_TYPES.XLSX;
            } else if (endsWith(toLowerCase(input), FILE_EXTENSIONS.XLS)) {
                info.fileType = FILE_TYPES.XLS;
            } else if (FileTypeDetector.isCsvContent(input)) {
                info.fileType = FILE_TYPES.CSV;
            }
        } else {
            info.source = 'buffer';
            info.fileType = FILE_TYPES.BUFFER;

            if (Buffer.isBuffer(input)) {
                info.fileSizeBytes = input.length;
            } else if (input instanceof ArrayBuffer) {
                info.fileSizeBytes = input.byteLength;
            }
        }

        return info;
    }

    /**
     * Check if string is a file path.
     * @param {string} input - The string to check
     * @returns {boolean} True if the string is a file path, false otherwise
     * @since 0.8.0
     * @example
     * InputProcessor.isFilePath('C:\\file.xlsx') // true
     * InputProcessor.isFilePath('/home/user/file.csv') // true
     * InputProcessor.isFilePath('http://example.com/file.xlsx') // false
     */
    private static isFilePath (input: string): boolean {
        // NOTE (File Scope): File extension patterns
        const fileExtPattern = /\.(xlsx?|csv)$/i;
        if (fileExtPattern.test(input)) return true;

        // NOTE (File Scope): Path patterns (Windows/Unix)
        const pathPattern = /^([a-zA-Z]:\\|\/|\.{1,2}[\/\\])/;
        if (pathPattern.test(input)) return true;

        return false;
    }
}
