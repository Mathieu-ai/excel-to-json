import { removeBreakLines } from 'generic-functions.mlai';

import XLSX from 'xlsx';

/**
    Convert an excel file to an array of jsons & call function to transform props and values
    * * 🔴 needs a 'code' or 'id' prop (aka:index)
    * * 🔴 only takes the last sheet (will be fixed in next release)
    * * 🟠 calls removeBreakLines from [generic-functions.mlai](https://www.npmjs.com/package/generic-functions.mlai)
    * * 🟢 can take any excel file
    @param {String} pathOfFile
    @returns object[]
    @example
        const tbResult = excelToJson('path/to/file/EXCEL.xlsx')
        console.log(tbResult);
        // Prints: [{...}, {...}]
*/
export function excelToJson(pathOfFile: string) {
    const tbData: any[] = [];

    try {
        const file = XLSX.readFile(pathOfFile, {
            cellDates: true,
            sheetStubs: true
        });

        for (let sheetName of file.SheetNames) {
            const worksheet = file.Sheets[sheetName];
            const headers: any = {};
            let val: any;
            for (const cell in worksheet) {
               // Skip non-data cells
                if (cell[0] === '!' || !cell[0]) continue;

                // Get column name (e.g. 'A')
                const col = cell.replace(/\d+/g, '');

                // Get row number (e.g. 1)
                const row = parseInt(cell.replace(col, ''), 10);

                // Get cell value
                val = worksheet[cell].v;

                // Handle header row
                if (row === 1) {
                    if (val) headers[col] = removeBreakLines(val);
                    continue;
                }

                // Handle empty cells
                if (!val && val !== 0) continue;

                // Handle boolean cells
                if (val === 'x' || val === 'X') val = true;

                // Create row object if it doesn't exist
                if (!tbData[row]) tbData[row] = {};

                // Set value for column property
                tbData[row][headers[col]] = val;
            }
        }

    } catch (error) {
        console.error('Error reading file:', error);
    }

    // Remove any rows with empty 'code' property
    return tbData.filter(({ code, id }) => code | id);
}
