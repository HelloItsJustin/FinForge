import { useState } from 'react';
import { Copy, Download, FileText, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function JsonOutput() {
  const { analysisResult, analysisId, setToastMessage } = useStore();
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!analysisResult) return null;

  const json = JSON.stringify(analysisResult, null, 2);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToastMessage('Failed to copy to clipboard');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finforge_analysis_${analysisResult.analysis_id || 'output'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
    if (!analysisResult) {
      setToastMessage('No analysis data available.');
      return;
    }

    setPdfLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/report/full`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisResult),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const aid = analysisId || analysisResult.analysis_id || 'adhoc';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinForge_Report_${aid}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToastMessage('Backend offline or report generation failed.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-white font-semibold text-sm">Analysis Output</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={downloadJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <Download className="w-3 h-3" />
            JSON
          </button>
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 border border-red-500 text-white text-xs transition-colors disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            {pdfLoading ? 'Generating…' : 'Forensic PDF'}
          </button>
        </div>
      </div>
      <div className="max-h-[300px] overflow-auto">
        <pre className="p-4 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
          {json}
        </pre>
      </div>
    </div>
  );
}
