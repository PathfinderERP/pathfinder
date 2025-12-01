// Utility functions for exporting data to CSV and Excel

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
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Convert array of objects to Excel-compatible HTML table
 */
export const convertToExcel = (data, headers) => {
    if (!data || data.length === 0) return '';

    // Create header row
    const headerRow = headers.map(h => `<th>${h.label}</th>`).join('');
    
    // Create data rows
    const dataRows = data.map(row => {
        const cells = headers.map(header => {
            const value = header.key.split('.').reduce((obj, key) => obj?.[key], row) || '';
            return `<td>${String(value)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Sheet1</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4CAF50; color: white; font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${dataRows}</tbody>
            </table>
        </body>
        </html>
    `;
};

/**
 * Download Excel file
 */
export const downloadExcel = (data, headers, filename = 'export') => {
    const html = convertToExcel(data, headers);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
