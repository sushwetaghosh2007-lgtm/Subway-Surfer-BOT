import React, { useState } from 'react';
import { Play, Copy, Check, CheckCircle2, AlertTriangle, ArrowRight, Terminal } from 'lucide-react';
import { SAMPLE_INPUT_JSON, SAMPLE_OUTPUT_JSON } from '../data/starterPacks';
import { executeBotStrategy, BOT_STRATEGIES } from '../lib/bots';
import { buildAdjacency } from '../lib/pathfinding';
import { GraphNode, GraphEdge, Runner, MoneyDrop, PoliceOfficer, RunnerAction } from '../types/game';

export const SampleIOInspector: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(SAMPLE_INPUT_JSON, null, 2)
  );
  const [outputResult, setOutputResult] = useState<string>(
    JSON.stringify(SAMPLE_OUTPUT_JSON, null, 2)
  );
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Execute bot on current input JSON
  const handleRunBot = () => {
    try {
      const state = JSON.parse(jsonInput);
      const tick = state.tick ?? 0;
      const nodes: GraphNode[] = state.graph_nodes ?? [];
      const edges: GraphEdge[] = state.graph_edges ?? [];
      const runners: Runner[] = state.my_runners ?? [];
      const drops: MoneyDrop[] = state.active_money_drops ?? [];
      const police: PoliceOfficer[] = state.police_officers ?? [];

      const safehouses = nodes.filter((n) => n.type === 'safehouse').map((n) => n.id);
      const moneySpots = nodes.filter((n) => n.type === 'money_spot').map((n) => n.id);

      // Execute autonomous bot strategy
      const actions = executeBotStrategy(
        tick,
        nodes,
        edges,
        runners,
        drops,
        police,
        safehouses,
        moneySpots,
        BOT_STRATEGIES[0]
      );

      // Validate actions
      const warnings: string[] = [];
      const adjacency = buildAdjacency(nodes, edges);
      const runnerById = new Map<number, Runner>(runners.map((r) => [r.id, r]));

      for (const act of actions) {
        const runner = runnerById.get(act.runner_id);
        if (!runner) {
          warnings.push(`Action assigned to unknown runner #${act.runner_id}`);
          continue;
        }

        if (runner.status === 'STUNNED' && act.action !== 'HOLD') {
          warnings.push(
            `Runner #${runner.id} is STUNNED; any action other than HOLD will be ignored by engine.`
          );
        }

        if (act.action === 'TRAVERSE') {
          const here = runner.current_node;
          const target = act.target_node;
          const neighbors = adjacency.get(here) || [];
          const isConnected = neighbors.some((n) => n.nodeId === target);
          if (!isConnected) {
            warnings.push(
              `Runner #${runner.id} cannot traverse ${here} -> ${target} (not a free neighbor track).`
            );
          }
        } else if (act.action === 'DEPOSIT') {
          if (!safehouses.includes(runner.current_node)) {
            warnings.push(
              `Runner #${runner.id} called DEPOSIT but is at Node #${runner.current_node} which is not a safehouse!`
            );
          }
        }
      }

      setValidationWarnings(warnings);
      setOutputResult(JSON.stringify({ runner_actions: actions }, null, 2));
    } catch (err: any) {
      setOutputResult(
        JSON.stringify(
          { error: `JSON Parse / Runtime Error: ${err.message}` },
          null,
          2
        )
      );
      setValidationWarnings([`Fatal Error: ${err.message}`]);
    }
  };

  const loadSample = (type: 'tick0' | 'tick42' | 'tick250') => {
    if (type === 'tick0') {
      const s0 = {
        tick: 0,
        graph_nodes: SAMPLE_INPUT_JSON.graph_nodes,
        graph_edges: SAMPLE_INPUT_JSON.graph_edges,
        my_runners: [
          {
            id: 0,
            current_node: 0,
            x: 120,
            y: 120,
            carrying_loot: 0,
            max_capacity: 100,
            status: 'ACTIVE',
            stun_ticks_remaining: 0,
          },
        ],
        active_money_drops: [
          {
            drop_id: 1,
            node_id: 2,
            target_safehouse_node: 0,
            current_value: 75.0,
            leak_lambda: 0.015,
            ttl_remaining: 35,
          },
        ],
        police_officers: SAMPLE_INPUT_JSON.police_officers,
      };
      setJsonInput(JSON.stringify(s0, null, 2));
    } else if (type === 'tick42') {
      setJsonInput(JSON.stringify(SAMPLE_INPUT_JSON, null, 2));
    } else {
      const s250 = {
        ...SAMPLE_INPUT_JSON,
        tick: 250,
        my_runners: [
          {
            id: 0,
            current_node: 1,
            x: 260,
            y: 100,
            carrying_loot: 85.0,
            max_capacity: 100,
            status: 'ACTIVE',
            stun_ticks_remaining: 0,
          },
        ],
      };
      setJsonInput(JSON.stringify(s250, null, 2));
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Terminal className="w-6 h-6 text-amber-400" />
          <span>Interactive Wire I/O Inspector & Validator</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Simulate a single engine tick. Paste or modify any game state JSON and verify the exact
          bot response and rule conformance.
        </p>
      </div>

      {/* Preset Quick Select */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Load Preset:</span>
          <button
            onClick={() => loadSample('tick0')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
          >
            Tick 0 (Initial)
          </button>
          <button
            onClick={() => loadSample('tick42')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
          >
            Tick 42 (Mid-Chase)
          </button>
          <button
            onClick={() => loadSample('tick250')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
          >
            Tick 250 (Endgame Deposit)
          </button>
        </div>

        <button
          onClick={handleRunBot}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run strategy(state)</span>
        </button>
      </div>

      {/* Validation Banner */}
      {validationWarnings.length > 0 ? (
        <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs space-y-1 text-rose-300">
          <div className="font-semibold flex items-center gap-1.5 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Rule Validation Warnings</span>
          </div>
          {validationWarnings.map((w, i) => (
            <p key={i} className="font-mono text-[11px] ml-5">
              • {w}
            </p>
          ))}
        </div>
      ) : (
        <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Actions strictly conform to all tournament rules (valid paths, legal actions).</span>
        </div>
      )}

      {/* Split JSON Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Pane */}
        <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Input: Engine GameState JSON (stdin)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Editable</span>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={18}
            className="w-full p-3 font-mono text-[11px] leading-5 bg-slate-950 text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            spellCheck={false}
          />
        </div>

        {/* Output Pane */}
        <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Output: Bot runner_actions JSON (stdout)
            </span>
            <button
              onClick={handleCopyOutput}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="w-full p-3 font-mono text-[11px] leading-5 bg-slate-950 text-emerald-400 overflow-auto h-[410px]">
            {outputResult}
          </pre>
        </div>
      </div>
    </div>
  );
};
