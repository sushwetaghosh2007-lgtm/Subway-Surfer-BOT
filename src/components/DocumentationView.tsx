import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Code,
  Terminal,
  Cpu,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { SAMPLE_INPUT_JSON, SAMPLE_OUTPUT_JSON } from '../data/starterPacks';

export const DocumentationView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-12 text-slate-200">
      {/* Hero Intro Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="text-xs font-mono text-amber-400 mb-2">
          COMPETITION TECHNICAL SPECIFICATION · REVISION 2.4
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Subway Escape – The Ultimate Chase
        </h1>
        <p className="mt-2 text-base text-slate-400 max-w-3xl leading-relaxed">
          Comprehensive technical documentation, wire protocol schemas, mathematical decay
          models, and local testing instructions for the autonomous bot challenge.
        </p>
      </div>

      {/* Table of Contents Quick Links */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap gap-4 text-xs font-medium">
        <a href="#wire-protocol" className="text-slate-400 hover:text-amber-300 transition-colors">
          01. Wire Protocol & JSON Schema
        </a>
        <span className="text-slate-700">·</span>
        <a href="#starter-wrappers" className="text-slate-400 hover:text-amber-300 transition-colors">
          02. Starter Code & Wrappers
        </a>
        <span className="text-slate-700">·</span>
        <a href="#game-mechanics" className="text-slate-400 hover:text-amber-300 transition-colors">
          03. Game Rules & Decay Formulas
        </a>
        <span className="text-slate-700">·</span>
        <a href="#local-testing" className="text-slate-400 hover:text-amber-300 transition-colors">
          04. Local Testing Simulator
        </a>
        <span className="text-slate-700">·</span>
        <a href="#submission-rules" className="text-slate-400 hover:text-amber-300 transition-colors">
          05. Final Submission & Limits
        </a>
      </div>

      {/* SECTION 1: WIRE PROTOCOL & JSON SCHEMA */}
      <section id="wire-protocol" className="space-y-6 scroll-mt-20">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>01. Official Input/Output Wire Protocol</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Communication between the tournament engine and your bot occurs strictly over standard
            input (<code className="text-amber-300 font-mono">stdin</code>) and standard output (
            <code className="text-amber-300 font-mono">stdout</code>) via newline-delimited JSON.
          </p>
        </div>

        {/* Protocol Flow Card */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Execution Lifecycle (Per Tick)</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 font-sans">
            <li>
              Engine writes a single line of minified JSON representing the full game state to{' '}
              <code className="text-amber-300 font-mono">stdin</code> and flushes.
            </li>
            <li>
              Your bot reads the line, unpacks the graph, runners, drops, and police positions, and
              calls <code className="text-amber-300 font-mono">strategy(...)</code>.
            </li>
            <li>
              Your bot writes exactly one line of JSON containing{' '}
              <code className="text-amber-300 font-mono">{"{\"runner_actions\": [...]}"}</code> to{' '}
              <code className="text-amber-300 font-mono">stdout</code> with a trailing newline and{' '}
              <strong className="text-white">flushes immediately</strong>.
            </li>
            <li>
              This loop executes for exactly <strong>300 ticks</strong> (Tick 0 to 299). When the
              engine closes <code className="text-amber-300 font-mono">stdin</code>, your process
              should exit cleanly with code <code className="text-amber-300 font-mono">0</code>.
            </li>
          </ol>
        </div>

        {/* Input Schema Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Tick Input JSON Schema</h3>
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Field</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-2 px-3 text-amber-300">tick</td>
                  <td className="py-2 px-3 text-slate-400">int</td>
                  <td className="py-2 px-3 font-sans">Current tick index, from 0 to 299.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-300">graph_nodes</td>
                  <td className="py-2 px-3 text-slate-400">Array&lt;Node&gt;</td>
                  <td className="py-2 px-3 font-sans">
                    List of vertices: <code>{"{id, x, y, type}"}</code> where type is{' '}
                    <code>"junction"</code>, <code>"money_spot"</code>, or <code>"safehouse"</code>.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-300">graph_edges</td>
                  <td className="py-2 px-3 text-slate-400">Array&lt;Edge&gt;</td>
                  <td className="py-2 px-3 font-sans">
                    Bidirectional tracks: <code>{"{from, to, current_weight}"}</code>. A negative
                    weight (e.g. <code>-1.0</code>) means the track is blocked.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-300">my_runners</td>
                  <td className="py-2 px-3 text-slate-400">Array&lt;Runner&gt;</td>
                  <td className="py-2 px-3 font-sans">
                    Your team agents: <code>id</code>, <code>current_node</code>, <code>x</code>,{' '}
                    <code>y</code>, <code>carrying_loot</code>, <code>max_capacity</code>,{' '}
                    <code>status ("ACTIVE"|"STUNNED")</code>, <code>stun_ticks_remaining</code>.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-300">active_money_drops</td>
                  <td className="py-2 px-3 text-slate-400">Array&lt;Drop&gt;</td>
                  <td className="py-2 px-3 font-sans">
                    Loot on map: <code>drop_id</code>, <code>node_id</code>,{' '}
                    <code>target_safehouse_node</code>, <code>current_value</code>,{' '}
                    <code>leak_lambda</code>, <code>ttl_remaining</code>.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-300">police_officers</td>
                  <td className="py-2 px-3 text-slate-400">Array&lt;Police&gt;</td>
                  <td className="py-2 px-3 font-sans">
                    Officers: <code>id</code>, continuous coords <code>x</code>, <code>y</code>,
                    velocity vector <code>vx</code>, <code>vy</code>, and circular hazard{' '}
                    <code>radius</code>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Output Schema */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Action Output JSON Schema</h3>
          <p className="text-xs text-slate-400">
            You must return a list with exactly one action per runner. Valid actions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-amber-400 font-bold">TRAVERSE</span>
              <p className="font-sans text-slate-400 text-[11px] mt-1">
                Move to an adjacent connected neighbor node.
              </p>
              <pre className="mt-1 text-slate-300">
                {`{"runner_id": 0, "action": "TRAVERSE", "target_node": 5}`}
              </pre>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-emerald-400 font-bold">COLLECT</span>
              <p className="font-sans text-slate-400 text-[11px] mt-1">
                Pick up loot currently on the runner's node up to max capacity.
              </p>
              <pre className="mt-1 text-slate-300">{`{"runner_id": 0, "action": "COLLECT"}`}</pre>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-sky-400 font-bold">DEPOSIT</span>
              <p className="font-sans text-slate-400 text-[11px] mt-1">
                Bank all carried loot into vault (must be on a safehouse node).
              </p>
              <pre className="mt-1 text-slate-300">{`{"runner_id": 0, "action": "DEPOSIT"}`}</pre>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded">
              <span className="text-slate-400 font-bold">HOLD</span>
              <p className="font-sans text-slate-400 text-[11px] mt-1">
                Stay on current node. Stunned runners automatically hold.
              </p>
              <pre className="mt-1 text-slate-300">{`{"runner_id": 0, "action": "HOLD"}`}</pre>
            </div>
          </div>
        </div>

        {/* Sample Payload Accordion */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200">Sample Wire Payload (Tick 42)</h4>
            <button
              onClick={() => handleCopy(JSON.stringify(SAMPLE_INPUT_JSON, null, 2), 'sample_input')}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
            >
              {copiedKey === 'sample_input' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'sample_input' ? 'Copied' : 'Copy Sample Input'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 p-3 rounded font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
            {JSON.stringify(SAMPLE_INPUT_JSON, null, 2)}
          </pre>
        </div>
      </section>

      {/* SECTION 2: STARTER CODE KITS */}
      <section id="starter-wrappers" className="space-y-6 scroll-mt-20 border-t border-slate-800 pt-8">
        <div>
          <h2 className="text-xl font-bold text-white">02. Starter Code & Language Wrappers</h2>
          <p className="mt-1 text-sm text-slate-400">
            We provide official starters for Python 3.10+, C++20, and Java 17/21. All wrappers
            contain the standard I/O reader, action validation, and exception safety shields.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400">Python 3.10+</span>
              <span className="text-[10px] text-slate-500 font-mono">my_bot.py</span>
            </div>
            <p className="text-xs text-slate-400">
              Standard official template. Includes built-in risk-weighted Dijkstra, multi-runner
              assignment, and exponential decay anticipation.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">Fastest to iterate & debug</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-sky-400">C++20</span>
              <span className="text-[10px] text-slate-500 font-mono">MyBot.cpp</span>
            </div>
            <p className="text-xs text-slate-400">
              High-performance implementation with <code>std::priority_queue</code> Dijkstra, fast
              I/O ties, and zero-allocation memory reuse for &lt;1ms per tick.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">Maximum compute budget</div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-400">Java 17/21</span>
              <span className="text-[10px] text-slate-500 font-mono">MyBot.java</span>
            </div>
            <p className="text-xs text-slate-400">
              Clean object-oriented starter with records, <code>BufferedReader</code>/
              <code>PrintWriter</code> line streaming, and priority queue graph search.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">Robust type safety</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
          <div className="text-xs text-slate-400">
            View full source code, copy snippets, or download files directly from the Starter Kits tab.
          </div>
          <a
            href="#starters"
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            <span>Open Starter Kits</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* SECTION 3: COMPLETE GAME RULES & MATHEMATICAL SPEC */}
      <section id="game-mechanics" className="space-y-6 scroll-mt-20 border-t border-slate-800 pt-8">
        <div>
          <h2 className="text-xl font-bold text-white">03. Complete Game Rules & Mathematical Models</h2>
          <p className="mt-1 text-sm text-slate-400">
            Rigorous mathematical definitions of loot decay, police hazard mechanics, and scoring.
          </p>
        </div>

        {/* Rule 1: Exponential Money Decay */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-300">1. Exponential Money Drop Decay & TTL</h3>
            <span className="text-xs font-mono text-slate-400">V(t) Formula</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every money drop spawns at a money spot with an initial capital{' '}
            <code className="text-amber-300 font-mono">initial_value</code> (V₀), an exponential
            leak coefficient <code className="text-amber-300 font-mono">leak_lambda</code> (λ),
            and a time-to-live <code className="text-amber-300 font-mono">ttl_remaining</code>.
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800/80 font-mono text-xs text-slate-200">
            V(t) = V_spawn · e^(-λ · (t - t_spawn))
          </div>
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
            <li>
              When <code className="text-amber-300 font-mono">ttl_remaining == 0</code>, the drop
              vanishes completely, yielding $0.
            </li>
            <li>
              When a runner collects, they receive{' '}
              <code className="text-amber-300 font-mono">
                min(current_value, max_capacity - carrying_loot)
              </code>
              .
            </li>
          </ul>
        </div>

        {/* Rule 2: Police Circular Hazard Circles */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-rose-400">2. Police Continuous Dynamics & Stuns</h3>
            <span className="text-xs font-mono text-slate-400">Capture Condition</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Police officers move with continuous coordinate physics (x + vx, y + vy), bouncing off
            arena perimeter boundaries. Each officer projects a circular hazard zone with radius{' '}
            <code className="text-rose-300 font-mono">radius</code> (R).
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800/80 font-mono text-xs text-slate-200">
            Collision when: √[(x_runner - x_police)² + (y_runner - y_police)²] ≤ R
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <p>
              <strong>The Stun Penalty:</strong>
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>
                The runner enters status <code className="text-amber-400 font-mono">STUNNED</code> for{' '}
                <strong>5 ticks</strong>.
              </li>
              <li>
                All currently carried loot (<code className="text-amber-400 font-mono">carrying_loot</code>)
                is immediately confiscated / wiped to $0.
              </li>
              <li>While stunned, the runner ignores commands and automatically executes HOLD.</li>
            </ul>
          </div>
        </div>

        {/* Rule 3: Dynamic Edge Weights & Graph Maintenance */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">3. Dynamic Edge Weights & Maintenance</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Edges represent bidirectional subway tracks. The weight indicates transit duration in
            ticks.
          </p>
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
            <li>
              Weight <code className="text-amber-300 font-mono">&gt; 0</code>: Track is operational.
            </li>
            <li>
              Weight <code className="text-rose-400 font-mono">&lt; 0</code> (e.g. -1.0): Track is
              temporarily blocked for maintenance. Your pathfinder must treat this as{' '}
              <code className="text-rose-300 font-mono">math.inf</code>.
            </li>
          </ul>
        </div>

        {/* Rule 4: Safehouse Deposit Mechanics */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-emerald-400">4. Safehouse Deposit Mechanics</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Loot in runner backpacks is at perpetual risk until deposited into a safehouse. When an
            active runner is on any node of type <code className="text-emerald-400 font-mono">"safehouse"</code>{' '}
            and issues <code className="text-emerald-400 font-mono">DEPOSIT</code>:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
            <li>100% of carried inventory is permanently added to your team's banked score.</li>
            <li>
              <code className="text-amber-300 font-mono">carrying_loot</code> resets to 0.0, freeing
              up full backpack capacity.
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 4: LOCAL TESTING SIMULATOR */}
      <section id="local-testing" className="space-y-6 scroll-mt-20 border-t border-slate-800 pt-8">
        <div>
          <h2 className="text-xl font-bold text-white">04. Local Testing Simulator & CLI</h2>
          <p className="mt-1 text-sm text-slate-400">
            How to verify, benchmark, and run practice matches on your development machine.
          </p>
        </div>

        {/* Test commands */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">1. Quick Self-Test</h3>
          <p className="text-xs text-slate-400">
            Run a dry-run check against a tiny sample state to confirm your script parses JSON and returns
            valid action schemas:
          </p>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-amber-300">
            python templates/python/my_bot.py --test
          </pre>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">2. Full 300-Tick Practice Match</h3>
          <p className="text-xs text-slate-400">
            Use the included <code className="text-amber-300 font-mono">run_practice.py</code> script to
            simulate a complete match against the standard engine:
          </p>
          <div className="space-y-2">
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-300">
              {`# Run Python Bot
python practice_arena/run_practice.py --bot "python my_bot.py" --seed 42

# Run Compiled C++ Bot
g++ -O3 -std=c++20 MyBot.cpp -o my_bot
python practice_arena/run_practice.py --bot "./my_bot" --seed 42`}
            </pre>
          </div>
        </div>
      </section>

      {/* SECTION 5: FINAL SUBMISSION & RUNTIME REQUIREMENTS */}
      <section id="submission-rules" className="space-y-6 scroll-mt-20 border-t border-slate-800 pt-8">
        <div>
          <h2 className="text-xl font-bold text-white">05. Final Submission & Runtime Requirements</h2>
          <p className="mt-1 text-sm text-slate-400">
            Strict system limits and rules enforced during the competition evaluation sandbox.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-bold text-amber-400">Latency Limit</span>
            <p className="text-xs text-slate-300">
              <strong>&lt; 1,000 ms per tick.</strong>
            </p>
            <p className="text-xs text-slate-400">
              If your bot fails to respond within 1 second, the engine forces a HOLD for that tick.
              Consistently timing out leads to match forfeiture.
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-bold text-sky-400">Compute & Memory</span>
            <p className="text-xs text-slate-300">
              <strong>1 vCPU, 512 MB RAM.</strong>
            </p>
            <p className="text-xs text-slate-400">
              Memory footprint must remain strictly under 512MB. Garbage collection spikes should be
              minimized.
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-bold text-rose-400">Standard I/O Discipline</span>
            <p className="text-xs text-slate-300">
              <strong>NEVER use print() or console.log() on stdout.</strong>
            </p>
            <p className="text-xs text-slate-400">
              Any non-JSON text on stdout corrupts the wire parser. All debugging logs must be routed
              exclusively to <code className="text-amber-300 font-mono">stderr</code>.
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <span className="text-xs font-bold text-emerald-400">Exception Fallback Shield</span>
            <p className="text-xs text-slate-300">
              <strong>Always wrap tick processing in try-except.</strong>
            </p>
            <p className="text-xs text-slate-400">
              A single unhandled exception terminates the bot process and loses the remaining 250+
              ticks. The official wrappers include this fallback automatically.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
