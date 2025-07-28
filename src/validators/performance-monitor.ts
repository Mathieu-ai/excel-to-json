import {
    PerformanceMetrics,
    MemoryUsageInfo,
    ProcessingProgress,
    PerformanceConfiguration
} from '../types';
import {
    isUndefined,
    isFunction,
    floor,
    round,
    defaults
} from 'generic-functions.mlai';

// ANCHOR (File Scope)

/**
 * Performance monitoring and optimization utilities for large spreadsheet processing.
 * Provides memory management, progress tracking, and performance metrics collection.
 * @since 0.2.6
 */
export class SpreadsheetPerformanceMonitor {
    private startTime: Date;
    private peakMemoryUsage: number = 0;
    private gcCycles: number = 0;
    private processedRows: number = 0;
    private configuration: Required<PerformanceConfiguration>;

    /**
     * Create a new performance monitor for spreadsheet processing.
     * @param {PerformanceConfiguration} [config={}] - Performance configuration options
     * @since 0.2.6
     */
    constructor(config: PerformanceConfiguration = {}) {
        this.startTime = new Date();
        this.configuration = this.normalizeConfiguration(config);

        // NOTE (File Scope): Set up memory monitoring if available
        if (global.gc && this.configuration.maxMemoryUsageMB > 0) {
            this.setupMemoryMonitoring();
        }
    }

    /**
     * Get current memory usage information for the Node.js process.
     * @returns {MemoryUsageInfo} Current memory usage info
     * @since 0.2.6
     */
    public getCurrentMemoryUsage (): MemoryUsageInfo {
        if (!isUndefined(process) && isFunction(process.memoryUsage)) {
            const usage = process.memoryUsage();
            const usedMB = usage.heapUsed / 1024 / 1024;
            const totalMB = usage.heapTotal / 1024 / 1024;

            this.peakMemoryUsage = Math.max(this.peakMemoryUsage, usedMB);

            return {
                used: usage.heapUsed,
                total: usage.heapTotal,
                percentage: (usedMB / totalMB) * 100,
                isLimitExceeded: usedMB > this.configuration.maxMemoryUsageMB
            };
        }

        // NOTE (File Scope): Fallback for environments without process.memoryUsage
        return {
            used: 0,
            total: 0,
            percentage: 0,
            isLimitExceeded: false
        };
    }

    /**
     * Check if memory usage exceeds configured limits and trigger garbage collection if needed.
     * @returns {boolean} True if GC was triggered, false otherwise
     * @since 0.2.6
     */
    public checkMemoryUsageAndOptimize (): boolean {
        const memoryInfo = this.getCurrentMemoryUsage();

        if (memoryInfo.isLimitExceeded && global.gc) {
            global.gc();
            this.gcCycles++;
            return true;
        }

        return false;
    }

    /**
     * Update processing progress and trigger the progress callback if configured.
     * @param {string} currentSheet - Name of the current sheet
     * @param {number} sheetsCompleted - Number of sheets completed
     * @param {number} totalSheets - Total number of sheets
     * @param {number} rowsProcessed - Number of rows processed in this update
     * @param {number} estimatedTotalRows - Estimated total rows in the current sheet
     * @since 0.2.6
     */
    public updateProgress (
        currentSheet: string,
        sheetsCompleted: number,
        totalSheets: number,
        rowsProcessed: number,
        estimatedTotalRows: number
    ): void {
        this.processedRows += rowsProcessed;

        if (this.configuration.enableProgressReporting && isFunction(this.configuration.progressCallback)) {
            const progress: ProcessingProgress = {
                currentSheet,
                sheetsCompleted,
                totalSheets,
                rowsProcessed,
                estimatedTotalRows,
                startTime: this.startTime,
                estimatedTimeRemainingMs: this.calculateEstimatedTimeRemaining(
                    sheetsCompleted,
                    totalSheets,
                    rowsProcessed,
                    estimatedTotalRows
                )
            };

            this.configuration.progressCallback(progress);
        }
    }

    /**
     * Determine optimal batch size based on current memory usage and performance.
     * @param {number} defaultBatchSize - Default batch size
     * @returns {number} Optimal batch size
     * @since 0.2.6
     */
    public getOptimalBatchSize (defaultBatchSize: number): number {
        const memoryInfo = this.getCurrentMemoryUsage();

        // NOTE (File Scope): Reduce batch size if memory usage is high
        if (memoryInfo.percentage > 80) {
            return Math.max(floor(defaultBatchSize * 0.5), 100);
        } else if (memoryInfo.percentage > 60) {
            return Math.max(floor(defaultBatchSize * 0.75), 500);
        }

        return defaultBatchSize;
    }

    /**
     * Check if streaming should be used based on file size and configuration.
     * @param {number} [fileSizeBytes] - File size in bytes
     * @returns {boolean} Whether streaming should be used
     * @since 0.2.6
     */
    public shouldUseStreaming (fileSizeBytes?: number): boolean {
        if (!this.configuration.enableStreaming) {
            return false;
        }

        // NOTE (File Scope): Use streaming for files larger than 100MB
        const streamingThreshold = 100 * 1024 * 1024; // 100MB
        return fileSizeBytes ? fileSizeBytes > streamingThreshold : false;
    }

    /**
     * Generate comprehensive performance metrics for the spreadsheet processing operation.
     * @returns {PerformanceMetrics} Performance metrics
     * @since 0.2.6
     */
    public generatePerformanceMetrics (): PerformanceMetrics {
        const endTime = new Date();
        const totalProcessingTimeMs = endTime.getTime() - this.startTime.getTime();
        const rowsPerSecond = this.processedRows / (totalProcessingTimeMs / 1000);

        return {
            totalProcessingTimeMs,
            peakMemoryUsageMB: this.peakMemoryUsage,
            rowsPerSecond: round(rowsPerSecond),
            streamingUsed: this.configuration.enableStreaming,
            gcCycles: this.gcCycles
        };
    }

    /**
     * Reset performance counters for a new operation.
     * @since 0.2.6
     */
    public reset (): void {
        this.startTime = new Date();
        this.peakMemoryUsage = 0;
        this.gcCycles = 0;
        this.processedRows = 0;
    }

    /**
     * Create optimized processing configuration based on system capabilities.
     * @param {PerformanceConfiguration} [baseConfig={}] - Base configuration
     * @returns {Required<PerformanceConfiguration>} Optimized configuration
     * @since 0.2.6
     */
    public static createOptimizedConfiguration (
        baseConfig: PerformanceConfiguration = {}
    ): Required<PerformanceConfiguration> {
        const defaultConfig: Required<PerformanceConfiguration> = {
            batchSize: 10000,
            maxMemoryUsageMB: 512,
            enableStreaming: true,
            streamingThresholdMB: 50,
            concurrencyLimit: 4,
            enableProgressReporting: false,
            progressCallback: () => { },
            enableGarbageCollection: true,
            gcThresholdMB: 256
        };

        // NOTE (File Scope): Detect system capabilities
        const systemMemoryMB = SpreadsheetPerformanceMonitor.getSystemMemoryMB();
        const cpuCores = SpreadsheetPerformanceMonitor.getCpuCoreCount();

        // NOTE (File Scope): Adjust defaults based on system capabilities
        if (systemMemoryMB) {
            defaultConfig.maxMemoryUsageMB = Math.min(
                floor(systemMemoryMB * 0.25), // Use 25% of system memory
                1024 // Cap at 1GB
            );
        }

        if (cpuCores) {
            defaultConfig.concurrencyLimit = Math.min(cpuCores, 8); // Cap at 8 concurrent operations
        }

        return defaults(baseConfig, defaultConfig) as Required<PerformanceConfiguration>;
    }

    /**
     * Get system memory in MB if available.
     * @returns {number | null} System memory in MB or null if unavailable
     * @since 0.2.6
     */
    private static getSystemMemoryMB (): number | null {
        try {
            if (!isUndefined(process) && process.arch) {
                const os = require('os');
                return floor(os.totalmem() / 1024 / 1024);
            }
        } catch {
            // NOTE (File Scope): Ignore errors in environments without os module
        }
        return null;
    }

    /**
     * Get CPU core count if available.
     * @returns {number | null} CPU core count or null if unavailable
     * @since 0.2.6
     */
    private static getCpuCoreCount (): number | null {
        try {
            if (!isUndefined(process) && process.arch) {
                const os = require('os');
                return os.cpus().length;
            }
        } catch {
            // NOTE (File Scope): Ignore errors in environments without os module
        }
        return null;
    }

    /**
     * Normalize configuration with project defaults.
     * @param {PerformanceConfiguration} config - Configuration to normalize
     * @returns {Required<PerformanceConfiguration>} Normalized configuration
     * @since 0.2.6
     */
    private normalizeConfiguration (config: PerformanceConfiguration): Required<PerformanceConfiguration> {
        return SpreadsheetPerformanceMonitor.createOptimizedConfiguration(config);
    }

    /**
     * Set up automatic memory monitoring and optimization for spreadsheet processing.
     * @since 0.2.6
     */
    private setupMemoryMonitoring (): void {
        // NOTE (File Scope): Check memory usage periodically during processing
        const memoryCheckInterval = setInterval(() => {
            this.checkMemoryUsageAndOptimize();
        }, 5000); // Check every 5 seconds

        // NOTE (File Scope): Clean up interval when process exits
        if (!isUndefined(process)) {
            process.on('exit', () => {
                clearInterval(memoryCheckInterval);
            });
        }
    }

    /**
     * Calculate estimated time remaining for the spreadsheet processing operation.
     * @param {number} sheetsCompleted - Sheets completed
     * @param {number} totalSheets - Total sheets
     * @param {number} rowsProcessedInCurrentSheet - Rows processed in current sheet
     * @param {number} estimatedTotalRowsInCurrentSheet - Estimated total rows in current sheet
     * @returns {number | undefined} Estimated time remaining in ms, or undefined if not enough data
     * @since 0.2.6
     */
    private calculateEstimatedTimeRemaining (
        sheetsCompleted: number,
        totalSheets: number,
        rowsProcessedInCurrentSheet: number,
        estimatedTotalRowsInCurrentSheet: number
    ): number | undefined {
        const elapsedMs = new Date().getTime() - this.startTime.getTime();

        if (elapsedMs < 1000) {
            return undefined; // NOTE (File Scope): Not enough data for estimation
        }

        // NOTE (File Scope): Calculate progress percentage
        const sheetProgress = rowsProcessedInCurrentSheet / estimatedTotalRowsInCurrentSheet;
        const totalProgress = (sheetsCompleted + sheetProgress) / totalSheets;

        if (totalProgress <= 0) {
            return undefined;
        }

        const estimatedTotalMs = elapsedMs / totalProgress;
        return Math.max(0, estimatedTotalMs - elapsedMs);
    }
}

/**
 * Utility functions for memory and performance optimization in spreadsheet-to-JSON conversion.
 * @since 0.2.6
 */
export class PerformanceOptimizer {
    /**
     * Process data in optimized batches to prevent memory overflow during spreadsheet conversion.
     * @template T, R
     * @param {T[]} items - Items to process
     * @param {(batch: T[]) => Promise<R[]> | R[]} processor - Batch processor function
     * @param {number} batchSize - Batch size
     * @param {SpreadsheetPerformanceMonitor} [monitor] - Optional performance monitor
     * @returns {Promise<R[]>} Processed results
     * @since 0.2.6
     */
    public static async processBatches<T, R> (
        items: T[],
        processor: (batch: T[]) => Promise<R[]> | R[],
        batchSize: number,
        monitor?: SpreadsheetPerformanceMonitor
    ): Promise<R[]> {
        const results: R[] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            // NOTE (File Scope): Check memory usage and optimize if needed
            if (monitor) {
                monitor.checkMemoryUsageAndOptimize();
                batchSize = monitor.getOptimalBatchSize(batchSize);
            }

            const batchResults = await processor(batch);
            results.push(...batchResults);

            // NOTE (File Scope): Allow event loop to breathe
            if (i % (batchSize * 5) === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }

        return results;
    }

    /**
     * Debounce function calls to prevent excessive processing.
     * @template T
     * @param {T} func - Function to debounce
     * @param {number} waitMs - Wait time in milliseconds
     * @returns {(...args: Parameters<T>) => void} Debounced function
     * @since 0.2.6
     */
    public static debounce<T extends (...args: any[]) => any> (
        func: T,
        waitMs: number
    ): (...args: Parameters<T>) => void {
        let timeoutId: NodeJS.Timeout | null = null;

        return (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                func(...args);
                timeoutId = null;
            }, waitMs);
        };
    }

    /**
     * Throttle function calls to limit execution frequency.
     * @template T
     * @param {T} func - Function to throttle
     * @param {number} waitMs - Wait time in milliseconds
     * @returns {(...args: Parameters<T>) => void} Throttled function
     * @since 0.2.6
     */
    public static throttle<T extends (...args: any[]) => any> (
        func: T,
        waitMs: number
    ): (...args: Parameters<T>) => void {
        let lastExecution = 0;

        return (...args: Parameters<T>) => {
            const now = Date.now();

            if (now - lastExecution >= waitMs) {
                lastExecution = now;
                func(...args);
            }
        };
    }
}
