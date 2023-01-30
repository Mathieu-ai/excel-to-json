import { mlFn } from 'generic-functions.mlai';
const { removeBreakLines } = mlFn;

import XLSX from 'xlsx';

/**
 * * Convert an excel file to an array of jsons & call function to transform props and values
 *  * Example :
 * ```js
 * $ExcelToJson(pathtoExcelFile)
 * // Prints: [{...},...]
 * ```
 * Convert an excel file to an array of jsons
 * * 🚫 - needs a 'code' prop (aka:index)
 * * ⚠️ - calls removeBreakLines from [generic-functions.mlai](https://www.npmjs.com/package/generic-functions.mlai)
 * * ✔️ - can take any excel file
 * ___
 * ```js
 * const tbMembers = $ExcelToJson('path/to/file/EXCEL.xlsx')
 * console.log(tbMembers);
 * // Prints: [{...}, {...}]
 * ```
 * ___
 * @param {String} pathOfFile
 * @returns object[]
 */
export function excelToJson(pathOfFile: any) {
    const tbData: any[] = [];
    const file = XLSX.readFile(pathOfFile, {
        cellDates: true,
        sheetStubs: true
    });

    // y = sheet Name
    file.SheetNames.forEach((y: string | number) => {
        const worksheet = file.Sheets[y];
        // headers = object of properties
        const headers: any = {};
        let val: any;

        for (const z in worksheet) {
            if (z[0] === '!' || !z[0]) {
                continue;
            }
            // parse column, row, and val
            let tt = 0;
            for (let i = 0; i < z.length; i++) {
                // z = row name (aka:'A1')
                const zi: any = z[i];
                if (!isNaN(zi)) {
                    // tt = index
                    tt = i;
                    break;
                }
            }
            // get column letter (aka: 'A')
            const col = z.substring(0, tt);
            // get row number (aka: 1)
            const row = parseInt(z.substring(tt));
            // get prop name (aka: 'code')
            val = worksheet[z].v;

            // header names
            if (row === 1) {
                // if val have '\n' in the string
                if (val) headers[col] = removeBreakLines(val);
                continue;
            }
            if (!val || val === '') val = false;
            // because some row have x or X as values
            if (val === 'x' || val === 'X') val = true;
            // tbData[row] = object identifier (aka: {code: 6})
            if (!tbData[row]) tbData[row] = {};
            // value of column
            tbData[row][headers[col]] = val;
        }

        // remove first two rows because empty
        tbData.shift();
        tbData.shift();
    });
    return tbData.filter((row) => row.code);
}
