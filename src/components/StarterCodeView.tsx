import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Terminal, Sparkles } from 'lucide-react';
import {
  PYTHON_STARTER_CODE,
  CPP_STARTER_CODE,
  JAVA_STARTER_CODE,
  LOCAL_PRACTICE_RUNNER,
  SAMPLE_INPUT_JSON,
} from '../data/starterPacks';

type LanguageKey = 'python' | 'cpp' | 'java' | 'runner';

interface FileConfig {
  name: string;
  filename: string;
  language: string;
  code: string;
  description: string;
}

export const StarterCodeView: React.FC = () => {
  const [activeLang, setActiveLang] = useState<LanguageKey>('python');
  const [copied, setCopied] = useState<boolean>(false);

  const fileMap: Record<LanguageKey, FileConfig> = {
    python: {
      name: 'Python 3.10+',
      filename: 'my_bot.py',
      language: 'python',
      code: PYTHON_STARTER_CODE.trim(),
      description:
        'Official production-grade starter bot featuring risk-weighted Dijkstra, multi-runner utility auctions, and exponential decay anticipation.',
    },
    cpp: {
      name: 'C++20 (Optimized)',
      filename: 'MyBot.cpp',
      language: 'cpp',
      code: CPP_STARTER_CODE.trim(),
      description:
        'Ultra-low latency C++20 implementation with priority_queue Dijkstra, line buffering, and zero heap thrashing.',
    },
    java: {
      name: 'Java 17/21',
      filename: 'MyBot.java',
      language: 'java',
      code: JAVA_STARTER_CODE.trim(),
      description:
        'Object-oriented Java starter with standard BufferedReader/PrintWriter stream loop and Dijkstra pathfinding.',
    },
    runner: {
      name: 'Local Arena Runner',
      filename: 'run_practice.py',
      language: 'python',
      code: LOCAL_PRACTICE_RUNNER.trim(),
      description:
        'Local practice arena test harness. Runs 300 ticks against your bot via subprocess pipes and reports banked capital.',
    },
  };

  const currentFile = fileMap[activeLang];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = currentFile.code.split('\n');

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCode className="w-6 h-6 text-amber-400" />
            <span>Official Starter Code Kits</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Plug-and-play templates ready for local compilation and deployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-sm shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {currentFile.filename}</span>
          </button>
        </div>
      </div>

      {/* Language Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
        {(Object.keys(fileMap) as LanguageKey[]).map((key) => {
          const item = fileMap[key];
          return (
            <button
              key={key}
              onClick={() => setActiveLang(key)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeLang === key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      {/* Info Card */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
        <div className="text-slate-300">
          <span className="font-semibold text-white">{currentFile.filename}:</span>{' '}
          {currentFile.description}
        </div>
        <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap ml-4">
          {lines.length} lines
        </span>
      </div>

      {/* Code Editor Frame with Line Numbers */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
        {/* Editor Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-slate-400 text-[11px] ml-2">{currentFile.filename}</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase">{currentFile.language}</span>
        </div>

        {/* Code Content */}
        <div className="overflow-x-auto max-h-[600px] p-4 text-slate-300 select-text flex">
          {/* Line Numbers */}
          <div className="select-none pr-4 text-slate-600 text-right text-[11px] font-mono border-r border-slate-800/60 mr-4">
            {lines.map((_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Actual Code */}
          <pre className="text-[11px] leading-5 font-mono text-slate-200 flex-1 whitespace-pre">
            {currentFile.code}
          </pre>
        </div>
      </div>
    </div>
  );
};
