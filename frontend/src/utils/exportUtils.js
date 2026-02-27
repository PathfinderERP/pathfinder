import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data, headers) => {
    if (!data || data.length === 0) return '';

    // Create header row
    const headerRow = headers.map(h => `"${h.label}"`).join(',');

    // Create data rows
    const dataRows = data.map(row => {
        return headers.map(header => {
            const value = header.key.split('.').reduce((obj, key) => obj?.[key], row) || '';
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (data, headers, filename = 'export') => {
    const csv = convertToCSV(data, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Download Excel file (.xlsx)
 */
export const downloadExcel = (data, headers, filename = 'export') => {
    if (!data || data.length === 0) return;

    // Process data to match headers labels
    const processedData = data.map(row => {
        const entry = {};
        headers.forEach(header => {
            const value = header.key.split('.').reduce((obj, key) => obj?.[key], row) || '';
            entry[header.label] = value;
        });
        return entry;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(processedData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

    // Save file
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};


/**
 * Show export options modal
 */
export const showExportOptions = (onExportCSV, onExportExcel) => {
    return {
        csv: onExportCSV,
        excel: onExportExcel
    };
};
