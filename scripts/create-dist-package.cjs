#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the main package.json
const mainPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create a new package.json for dist with corrected paths
const distPackageJson = {
    ...mainPackageJson,
    // Remove dist/ prefix from all paths since we're publishing from dist folder
    main: "index.js",
    module: "index.js",
    types: "index.d.ts",
    exports: {
        ".": {
            "import": "./index.js",
            "require": "./index.js",
            "types": "./index.d.ts"
        },
        "./library": {
            "import": "./library/index.js",
            "require": "./library/index.js",
            "types": "./library/index.d.ts"
        },
        "./library/converter": {
            "import": "./library/converter.js",
            "require": "./library/converter.js",
            "types": "./library/converter.d.ts"
        },
        "./library/utils": {
            "import": "./library/utils.js",
            "require": "./library/utils.js",
            "types": "./library/utils.d.ts"
        },
        "./types": {
            "import": "./types.js",
            "require": "./types.js",
            "types": "./types.d.ts"
        }
    },
    // Only include what's in the dist folder
    files: [
        "*",
        "**/*"
    ],
    // Clean up scripts for published package
    scripts: {
        test: mainPackageJson.scripts.test
    },
    // Remove dev dependencies
    devDependencies: undefined,
    // Remove directory from publishConfig since we're already in dist
    publishConfig: {
        access: "public",
        registry: "https://registry.npmjs.org/"
    }
};

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

// Write the new package.json to dist
fs.writeFileSync(
    path.join('dist', 'package.json'),
    JSON.stringify(distPackageJson, null, 2)
);

// Create a simple .npmignore for dist to avoid any unwanted files
const distNpmIgnore = `# Only ignore potential temporary files
*.tmp
*.temp
.DS_Store
Thumbs.db
`;

fs.writeFileSync(
    path.join('dist', '.npmignore'),
    distNpmIgnore
);

console.log('✅ Created dist/package.json and dist/.npmignore for npm publishing');