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
        switch (true) {
            case isString(input):
                return this.processStringInputForProcessing(input as string);
            case input instanceof ArrayBuffer:
                return input;
            case Buffer.isBuffer(input):
                return this.convertBufferToArrayBuffer(input as Buffer);
            case input instanceof Uint8Array:
                return this.convertUint8ArrayToArrayBuffer(input);
            default:
                throw new Error(ERROR_MESSAGES.UNSUPPORTED_INPUT_TYPE);
        }
    }

    /**
     * Process string input for processing (URL, file path, or content)
     * @param {string} input - String input to process
     * @returns {Promise<ArrayBuffer | string>} Processed input
     * @private
     * @since 0.8.0
     */
    private static async processStringInputForProcessing (input: string): Promise<ArrayBuffer | string> {
        switch (true) {
            case NetworkHandler.isValidUrl(input):
                return await NetworkHandler.fetchFileWithRetry(input);
            case this.isFilePath(input):
                return this.readFileAsArrayBuffer(input);
            default:
                // NOTE (File Scope): Assume it's content
                return input;
        }
    }

    /**
     * Read file from path as ArrayBuffer
     * @param {string} filePath - File path to read
     * @returns {Promise<ArrayBuffer>} File content as ArrayBuffer
     * @private
     * @since 0.8.0
     */
    private static async readFileAsArrayBuffer (filePath: string): Promise<ArrayBuffer> {
        const fs = await import('fs');
        const buffer = fs.readFileSync(filePath);
        return this.convertBufferToArrayBuffer(buffer);
    }

    /**
     * Convert Buffer to ArrayBuffer
     * @param {Buffer} buffer - Buffer to convert
     * @returns {ArrayBuffer} Converted ArrayBuffer
     * @private
     * @since 0.8.0
     */
    private static convertBufferToArrayBuffer (buffer: Buffer): ArrayBuffer {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    }

    /**
     * Convert Uint8Array to ArrayBuffer
     * @param {Uint8Array} uint8Array - Uint8Array to convert
     * @returns {ArrayBuffer} Converted ArrayBuffer
     * @private
     * @since 0.8.0
     */
    private static convertUint8ArrayToArrayBuffer (uint8Array: Uint8Array): ArrayBuffer {
        return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
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
            return this.processStringInput(input, info);
        }

        return this.processBufferInput(input, info);
    }

    /**
     * Process string input to determine file type and source
     * @param {string} input - String input to process
     * @param {SourceFileInfo} info - Base file info object
     * @returns {SourceFileInfo} Updated file info
     * @private
     * @since 0.8.0
     */
    private static processStringInput (input: string, info: SourceFileInfo): SourceFileInfo {
        info.source = input;

        const lowerInput = toLowerCase(input);

        switch (true) {
            case NetworkHandler.isValidUrl(input):
                info.fileType = FILE_TYPES.URL;
                break;
            case endsWith(lowerInput, FILE_EXTENSIONS.CSV):
                info.fileType = FILE_TYPES.CSV;
                break;
            case endsWith(lowerInput, FILE_EXTENSIONS.XLSX):
                info.fileType = FILE_TYPES.XLSX;
                break;
            case endsWith(lowerInput, FILE_EXTENSIONS.XLS):
                info.fileType = FILE_TYPES.XLS;
                break;
            case FileTypeDetector.isCsvContent(input):
                info.fileType = FILE_TYPES.CSV;
                break;
            default:
                info.fileType = FILE_TYPES.BUFFER;
        }

        return info;
    }

    /**
     * Process buffer input to determine file size and type
     * @param {SpreadsheetInput} input - Buffer input to process
     * @param {SourceFileInfo} info - Base file info object
     * @returns {SourceFileInfo} Updated file info
     * @private
     * @since 0.8.0
     */
    private static processBufferInput (input: SpreadsheetInput, info: SourceFileInfo): SourceFileInfo {
        info.source = 'buffer';
        info.fileType = FILE_TYPES.BUFFER;

        switch (true) {
            case Buffer.isBuffer(input):
                info.fileSizeBytes = (input as Buffer).length;
                break;
            case input instanceof ArrayBuffer:
                info.fileSizeBytes = input.byteLength;
                break;
            case input instanceof Uint8Array:
                info.fileSizeBytes = input.byteLength;
                break;
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
