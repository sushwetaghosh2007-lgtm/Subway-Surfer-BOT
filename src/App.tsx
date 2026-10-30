import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { ArenaSimulator } from './components/ArenaSimulator';
import { DocumentationView } from './components/DocumentationView';
import { StarterCodeView } from './components/StarterCodeView';
import { RulesView } from './components/RulesView';
import { SampleIOInspector } from './components/SampleIOInspector';
import { PYTHON_STARTER_CODE } from './data/starterPacks';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [currentTick, setCurrentTick] = useState<number>(0);
  const [totalBanked, setTotalBanked] = useState<number>(0);

  const handleDownloadPython = () => {
    const blob = new Blob([PYTHON_STARTER_CODE.trim()], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my_bot.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEngineTickUpdate = (tick: number, banked: number) => {
    setCurrentTick(tick);
    setTotalBanked(banked);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onDownloadPython={handleDownloadPython}
        currentTick={currentTick}
        totalBanked={totalBanked}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16">
        {activeTab === 'simulator' && (
          <ArenaSimulator onEngineTickUpdate={handleEngineTickUpdate} />
        )}
        {activeTab === 'docs' && <DocumentationView />}
        {activeTab === 'starters' && <StarterCodeView />}
        {activeTab === 'rules' && <RulesView />}
        {activeTab === 'io_inspector' && <SampleIOInspector />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Subway Escape: The Ultimate Chase · Autonomous Bot Competition Specification</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>300 Ticks</span>
            <span>·</span>
            <span>1000ms Latency Budget</span>
            <span>·</span>
            <span>Stdin/Stdout JSON Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
