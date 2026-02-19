import { useRef, useState, useCallback } from 'react';
import { Upload, Play, FileText, AlertCircle, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseCSV } from '../utils/csvParser';
import { runDetection } from '../utils/detector';
import { generateMockTransactions } from '../utils/mockDataGenerator';
import MethodologyPanel from './MethodologyPanel';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

async function tryBackendAnalysis(transactions: { [k: string]: unknown }[]): Promise<unknown> {
  const csv = [
    'transaction_id,sender_id,receiver_id,amount,timestamp',
    ...transactions.map(t =>
      `${t.transaction_id},${t.sender_id},${t.receiver_id},${t.amount},${t.timestamp}`
    ),
  ].join('\n');

  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'data.csv');

  const resp = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(`Backend error: ${resp.status}`);
  return resp.json();
}

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const {
    transactions,
    fileName,
    isAnalyzing,
    analysisStatus,
    setTransactions,
    setAnalysisResult,
    setIsAnalyzing,
    setAnalysisStatus,
    setBackendConnected,
    setLastAnalysisTime,
    setTotalProcessed,
    setAnalysisId,
    setToastMessage,
  } = useStore();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseErrors(['Only CSV files are accepted.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { transactions: parsed, errors } = parseCSV(text);
      setParseErrors(errors);
      if (parsed.length > 0) setTransactions(parsed, file.name);
    };
    reader.readAsText(file);
  }, [setTransactions]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const clearFile = () => {
    setTransactions(generateMockTransactions(), undefined);
    setParseErrors([]);
  };

  const runAnalysis = async () => {
    if (transactions.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Building transaction graph…');

    await new Promise(r => setTimeout(r, 300));
    setAnalysisStatus('Running cycle detection…');
    await new Promise(r => setTimeout(r, 400));
    setAnalysisStatus('Scoring suspicious accounts…');
    await new Promise(r => setTimeout(r, 300));

    let result;
    let usedBackend = false;

    // Attempt backend analysis (relative paths work on Vercel)
    try {
      result = await tryBackendAnalysis(transactions as unknown as { [k: string]: unknown }[]);
      usedBackend = true;
      const backendResult = result as { analysis_id?: string };
      if (backendResult.analysis_id) {
        setAnalysisId(backendResult.analysis_id);
      }
    } catch (err) {
      console.error('Backend analysis failed:', err);
      result = runDetection(transactions);
      // Only show toast if the backend URL was explicitly set or if it's a real failure
      if (BACKEND_URL) {
        setToastMessage('Backend offline — using client-side detection engine.');
      }
    }

    setBackendConnected(usedBackend);
    setAnalysisResult(result as ReturnType<typeof runDetection>);
    setTotalProcessed(transactions.length);
    setLastAnalysisTime(new Date().toLocaleTimeString());
    setAnalysisStatus('');
    setIsAnalyzing(false);
  };

  const displayName = fileName ?? 'mock_transactions.csv';
  const rowCount = transactions.length;
  const isMock = !fileName;

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold text-sm uppercase tracking-widest mb-3">Input Data</h2>

        <div
          className={`relative border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 ${dragOver
            ? 'border-red-500 bg-red-500/5'
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
            }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-300 text-sm font-medium">Drop CSV here</p>
          <p className="text-slate-500 text-xs mt-1">or click to browse</p>
          <p className="text-slate-600 text-xs mt-2">Required: transaction_id, sender_id, receiver_id, amount, timestamp</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {parseErrors.length > 0 && (
          <div className="mt-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            {parseErrors.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}

        {rowCount > 0 && (
          <div className="mt-3 flex items-center justify-between p-2.5 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-slate-200 text-xs font-medium truncate">{displayName}</p>
                <p className="text-slate-500 text-xs">
                  {rowCount} rows{isMock && <span className="text-amber-400 ml-1">(mock)</span>}
                </p>
              </div>
            </div>
            {!isMock && (
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-b border-slate-700">
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || transactions.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/30"
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Analysis
            </>
          )}
        </button>

        {isAnalyzing && analysisStatus && (
          <p className="mt-2 text-xs text-slate-400 text-center animate-pulse">{analysisStatus}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <MethodologyPanel />
      </div>
    </aside>
  );
}
