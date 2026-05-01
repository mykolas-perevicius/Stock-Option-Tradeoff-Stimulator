import React, { useState } from 'react';

/**
 * Export menu for downloading charts, data, and reports
 */
export default function ExportMenu({
  chartRef,
  chartData,
  params,
  stats,
  onExportPNG,
  onExportCSV,
  onExportPDF,
  onCopyURL,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  const handleCopyURL = async () => {
    try {
      await onCopyURL();
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('Failed');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const exportOptions = [
    {
      label: 'Export as PNG',
      description: 'High-resolution chart image',
      icon: '🖼️',
      onClick: onExportPNG,
    },
    {
      label: 'Export as CSV',
      description: 'P&L data for spreadsheets',
      icon: '📊',
      onClick: onExportCSV,
    },
    {
      label: 'Export as PDF',
      description: 'Full report with all data',
      icon: '📄',
      onClick: onExportPDF,
    },
    {
      label: 'Copy Share URL',
      description: 'Link with current settings',
      icon: '🔗',
      onClick: handleCopyURL,
      status: copyStatus,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors"
      >
        <span>📥</span>
        <span>Export</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20">
            <div className="p-2">
              {exportOptions.map((option, index) => (
                <button
                  key={option.label}
                  onClick={() => {
                    option.onClick();
                    if (option.label !== 'Copy Share URL') {
                      setIsOpen(false);
                    }
                  }}
                  className="w-full flex items-start gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <span className="text-xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-200">
                      {option.label}
                      {option.status && (
                        <span className="ml-2 text-green-400 text-xs">
                          {option.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="border-t border-gray-700 p-3">
              <p className="text-xs text-gray-500">
                Tip: Right-click on charts to save images directly
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// The canonical generateCSV / generateShareableURL / parseURLParams live in
// src/utils/exportHelpers.js — older duplicates here used a stripped 7-field
// schema and would silently lose stockPosition / optionPosition / userExpectedMove.
// Deleted to prevent the stale copies from being imported again.
