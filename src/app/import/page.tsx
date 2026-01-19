"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useLanguage } from '../LanguageProvider';

const TABLES = [
  { name: "routes", label: "Routes" },
  { name: "vendors", label: "Vendors" },
  { name: "items", label: "Items" },
  { name: "bills", label: "Bills" },
  { name: "bill_items", label: "Bill Items" },
];

type ImportResult = {
  success: boolean;
  count?: number;
  error?: any;
};

type FilesState = {
  [key: string]: File | undefined;
};

type ResultsState = {
  [key: string]: ImportResult;
};

export default function ImportPage() {
  const { language } = useLanguage();
  const [files, setFiles] = useState<FilesState>({});
  const [results, setResults] = useState<ResultsState>({});
  const [loading, setLoading] = useState(false);

  const handleFileChange = (table: string, file: File | undefined) => {
    setFiles((prev) => ({ ...prev, [table]: file }));
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const isCsv = file.name.endsWith('.csv');

      if (isCsv) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors && results.errors.length > 0 && !(results.errors.length === 1 && results.errors[0].code === 'UndetectableDelimiter')) {
              reject(results.errors);
            } else {
              resolve(results.data);
            }
          },
          error: (error) => reject(error)
        });
      } else {
        // Assume Excel
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleImport = async () => {
    setLoading(true);
    let importResults: ResultsState = {};

    for (const { name } of TABLES) {
      const file = files[name];
      if (!file) continue;

      try {
        const data = await parseFile(file);

        // Send to API
        const res = await fetch(`/api/${name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Array.isArray(data) ? data : [data]),
        });

        if (!res.ok) throw new Error(await res.text());
        importResults[name] = { success: true, count: data.length };
      } catch (e: any) {
        let errorMessage = e.message;
        if (Array.isArray(e)) {
          errorMessage = e.map(err => err.message || JSON.stringify(err)).join(', ');
        }
        importResults[name] = { success: false, error: errorMessage };
      }
    }
    setResults(importResults);
    setLoading(false);
  };

  const downloadSample = (filename: string, headers: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #0001", color: "#222" }}>
      <h1>{language === 'gu' ? 'જથ્થાબંધ ડેટા આયાત કરો' : 'Bulk Import Data'}</h1>
      <p>{language === 'gu' ? 'દરેક ટેબલ માટે CSV અથવા Excel (.xlsx, .xls) ફાઇલો અપલોડ કરો.' : 'Upload CSV or Excel (.xlsx, .xls) files for each table.'}</p>

      {/* Instructions Section */}
      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>{language === 'gu' ? 'ફોર્મેટ સૂચનાઓ' : 'Format Instructions'}</h3>
        <p style={{ marginBottom: '10px' }}>
          {language === 'gu'
            ? 'તમે .csv, .xlsx, અથવા .xls ફાઇલો અપલોડ કરી શકો છો. નમૂના ફાઇલો ડાઉનલોડ કરવા માટે નીચેની લિંક્સનો ઉપયોગ કરો:'
            : 'You can upload .csv, .xlsx, or .xls files. Use the links below to download sample templates:'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>

          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Routes</strong>
              <button
                onClick={() => downloadSample('routes', 'name')}
                style={{ fontSize: '0.8em', padding: '2px 8px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                Download Sample
              </button>
            </div>
            <code style={{ display: 'block', marginTop: '5px', background: '#eee', padding: '5px' }}>name</code>
          </div>

          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Vendors</strong>
              <button
                onClick={() => downloadSample('vendors', 'name,route_name,contact,address')}
                style={{ fontSize: '0.8em', padding: '2px 8px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                Download Sample
              </button>
            </div>
            <code style={{ display: 'block', marginTop: '5px', background: '#eee', padding: '5px' }}>name, route_name, contact, address</code>
          </div>

          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Items</strong>
              <button
                onClick={() => downloadSample('items', 'name_en,name_gu,rate,has_gst,gst_percentage,category')}
                style={{ fontSize: '0.8em', padding: '2px 8px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                Download Sample
              </button>
            </div>
            <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '4px' }}>Now supports categories!</div>
            <code style={{ display: 'block', marginTop: '5px', background: '#eee', padding: '5px' }}>name_en, name_gu, rate, has_gst, gst_percentage, category</code>
            <div style={{ fontSize: '0.85em', marginTop: '4px' }}>
              *category options: <em>Fryums, Namkeen, Others</em>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Bills (Legacy)</strong>
              <button
                onClick={() => downloadSample('bills', 'vendor_name,date')}
                style={{ fontSize: '0.8em', padding: '2px 8px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                Download Sample
              </button>
            </div>
            <code style={{ display: 'block', marginTop: '5px', background: '#eee', padding: '5px' }}>vendor_name, date</code>
            <span style={{ fontSize: '0.8em' }}>(Date format: YYYY-MM-DD)</span>
          </div>

          <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Bill Items (Legacy)</strong>
              <button
                onClick={() => downloadSample('bill_items', 'bill_id,item_name_en,quantity')}
                style={{ fontSize: '0.8em', padding: '2px 8px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                Download Sample
              </button>
            </div>
            <code style={{ display: 'block', marginTop: '5px', background: '#eee', padding: '5px' }}>bill_id, item_name_en, quantity</code>
          </div>
        </div>
      </div>

      {TABLES.map(({ name, label }) => (
        <div key={name} style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            {label} ({language === 'gu' ? 'ફાઈલ' : 'File'}):
          </label>
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={e => {
              const file = e.target.files && e.target.files[0] ? e.target.files[0] as File : undefined;
              handleFileChange(name, file);
            }}
            style={{ display: 'block', width: '100%' }}
          />
        </div>
      ))}

      <button onClick={handleImport} disabled={loading} style={{ marginTop: 16, padding: "10px 30px", fontSize: '1.1em', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        {loading ? (language === 'gu' ? 'આયાત થઈ રહ્યું છે...' : 'Importing...') : (language === 'gu' ? 'બધું આયાત કરો' : 'Start Import')}
      </button>

      <div style={{ marginTop: 32 }}>
        {Object.keys(results).length > 0 && <h3>{language === 'gu' ? 'પરિણામો:' : 'Results:'}</h3>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.entries(results).map(([table, res]) => (
            <li key={table} style={{ padding: '8px', marginBottom: '4px', borderRadius: '4px', background: res.success ? '#e6fffa' : '#fff5f5', border: `1px solid ${res.success ? '#b2f5ea' : '#feb2b2'}` }}>
              <strong>{table.toUpperCase()}:</strong> {res.success ?
                <span style={{ color: 'green' }}>✅ {language === 'gu' ? 'સફળતાપૂર્વક આયાત' : 'Successfully imported'} {res.count} {language === 'gu' ? 'રેકોર્ડ્સ' : 'records'}.</span>
                :
                <span style={{ color: 'red' }}>❌ {language === 'gu' ? 'ભૂલ:' : 'Error:'} {res.error}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 