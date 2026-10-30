import React from 'react';
import {
  Play,
  RotateCcw,
  BookOpen,
  Code2,
  Cpu,
  FileCode,
  ShieldAlert,
  Download,
} from 'lucide-react';

export type ActiveTab = 'simulator' | 'docs' | 'starters' | 'rules' | 'io_inspector';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onDownloadPython: () => void;
  currentTick: number;
  totalBanked: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onDownloadPython,
  currentTick,
  totalBanked,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shrink-0 sticky top-0 z-40">
      {/* Zone 1: Single Brand wordmark element */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
          SE
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Subway Escape
          </span>
          <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-mono">
            Bot Arena & Kit
          </span>
        </div>
      </div>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
        <button
          onClick={() => onSelectTab('simulator')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'simulator'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Interactive Arena</span>
        </button>

        <button
          onClick={() => onSelectTab('docs')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'docs'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Technical Docs</span>
        </button>

        <button
          onClick={() => onSelectTab('starters')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'starters'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Starter Code Kits</span>
        </button>

        <button
          onClick={() => onSelectTab('rules')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'rules'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Game Rules & Decay</span>
        </button>

        <button
          onClick={() => onSelectTab('io_inspector')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'io_inspector'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Wire I/O Inspector</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action & Quick Metric */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono px-3 py-1 bg-slate-950/70 border border-slate-800 rounded-md">
          <span className="text-slate-400">
            Tick: <strong className="text-white tabular-nums">{currentTick}/300</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">
            Banked: <strong className="text-emerald-300 tabular-nums">${totalBanked.toFixed(2)}</strong>
          </span>
        </div>

        <button
          onClick={onDownloadPython}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap shadow-sm shadow-amber-500/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Python Bot</span>
        </button>
      </div>
    </header>
  );
};
