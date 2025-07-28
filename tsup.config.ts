import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: 'dist',
    external: ['xlsx', 'generic-functions.mlai'],
    splitting: false,
    minify: false,
    target: 'es2018',
    esbuildOptions (options) {
        options.banner = {
            js: '// excel-to-json.mlai - Transform Excel & CSV files into JSON with advanced features',
        };
    },
});