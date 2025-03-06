const fs = require('fs');
const XLSX = require('xlsx');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

// Check if input and output files are provided
if (!inputFile || !outputFile) {
    console.error('Usage: node fhir2excel.js <input-file> <output-file>');
    process.exit(1);
}

// Read and parse JSON file
const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

// Function to flatten JSON objects
function flattenJson(data, parentKey = '', result = {}) {
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const newKey = parentKey ? `${parentKey}.${key}` : key;
            const value = data[key];

            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        flattenJson(item, `${newKey}[${index}]`, result);
                    } else {
                        result[`${newKey}[${index}]`] = item;
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                flattenJson(value, newKey, result);
            } else {
                result[newKey] = value;
            }
        }
    }
    return result;
}

// Function to generate Excel data from the JSON
function generateExcelData(jsonData) {
    let excelData = [['Resource Type', 'JSON Path', 'Value']];
    const flattenedBundle = flattenJson(jsonData);

    // Handle Bundle-level properties (not part of the 'entry')
    for (const key in flattenedBundle) {
        if (key !== 'entry') {
            excelData.push(['Bundle', key, flattenedBundle[key]]);
        }
    }

    // Handle resources within 'entry'
    if (Array.isArray(jsonData.entry)) {
        jsonData.entry.forEach(entry => {
            const resourceType = entry.resource.resourceType;
            const flattenedResource = flattenJson(entry.resource);

            for (const key in flattenedResource) {
                excelData.push([resourceType, key, flattenedResource[key]]);
            }
        });
    }

    return excelData;
}

// Function to write Excel data to a file
function exportToExcel(excelData, filename = 'output.xlsx') {
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
}

// Generate and export Excel file
try {
    const excelData = generateExcelData(jsonData);
    exportToExcel(excelData, outputFile);
    console.log(`Excel file generated successfully: ${outputFile}`);
} catch (error) {
    console.error('Error generating Excel file:', error);
}
