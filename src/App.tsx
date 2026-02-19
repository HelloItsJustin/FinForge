export const API_URL = "https://finforge-api-58ec.onrender.com";
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { generateMockTransactions } from './utils/mockDataGenerator';
import { runDetection } from './utils/detector';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import StatCards from './components/StatCards';
import FraudRingTable from './components/FraudRingTable';
import SuspiciousAccountsPanel from './components/SuspiciousAccountsPanel';
import JsonOutput from './components/JsonOutput';
import ThreatLevelBanner from './components/ThreatLevelBanner';
import TimelineSlider from './components/TimelineSlider';
import ForensicProfileCard from './components/ForensicProfileCard';
import BaselineComparison from './components/BaselineComparison';

function ToastNotification() {
  const { toastMessage, setToastMessage } = useStore();

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage, setToastMessage]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm animate-slide-up">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 px-4 py-3 flex items-start gap-3">
        <span className="text-amber-400 text-lg shrink-0">⚠</span>
        <p className="text-slate-200 text-sm">{toastMessage}</p>
        <button
          onClick={() => setToastMessage(null)}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const {
    setTransactions,
    setAnalysisResult,
    setLastAnalysisTime,
    setTotalProcessed,
    setMasterminds,
    analysisResult,
  } = useStore();

  useEffect(() => {
    const txs = generateMockTransactions();
    setTransactions(txs);
    const result = runDetection(txs);
    setAnalysisResult(result);
    setTotalProcessed(txs.length);
    setLastAnalysisTime(new Date().toLocaleTimeString());

    // Extract masterminds
    const mmIds = result.suspicious_accounts
      .filter(a => a.is_mastermind)
      .map(a => a.account_id);
    setMasterminds(mmIds);
  }, [setTransactions, setAnalysisResult, setLastAnalysisTime, setTotalProcessed, setMasterminds]);

  // Update masterminds whenever analysis result changes
  useEffect(() => {
    if (!analysisResult) return;
    const mmIds = analysisResult.suspicious_accounts
      .filter(a => a.is_mastermind)
      .map(a => a.account_id);
    setMasterminds(mmIds);
  }, [analysisResult, setMasterminds]);

  return (
    <>
      {/* Mastermind pulse animation */}
      <style>{`
        @keyframes mastermind-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
          50% { box-shadow: 0 0 12px 4px rgba(234, 179, 8, 0.2); }
        }
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>

      <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
        <Header />
        <ThreatLevelBanner />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar />

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
              <GraphView />
            </div>
            <TimelineSlider />

            <div className="overflow-y-auto p-4 space-y-4 max-h-[50vh]">
              <StatCards />
              <BaselineComparison />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <FraudRingTable />
                <SuspiciousAccountsPanel />
              </div>

              <JsonOutput />
            </div>
          </main>
        </div>
      </div>

      <ForensicProfileCard />
      <ToastNotification />
    </>
  );
}
