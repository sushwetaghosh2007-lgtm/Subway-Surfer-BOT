import React, { useState } from 'react';
import {
  ShieldAlert,
  Coins,
  TrendingDown,
  Navigation,
  Clock,
  Compass,
  AlertTriangle,
  Award,
} from 'lucide-react';

export const RulesView: React.FC = () => {
  // Interactive decay calculator state
  const [initialValue, setInitialValue] = useState<number>(100);
  const [decayLambda, setDecayLambda] = useState<number>(0.02);
  const [elapsedTicks, setElapsedTicks] = useState<number>(15);

  const currentValue = initialValue * Math.exp(-decayLambda * elapsedTicks);
  const percentRetained = ((currentValue / initialValue) * 100).toFixed(1);

  // Generate 25 points for mini SVG decay curve
  const points = Array.from({ length: 40 }, (_, i) => {
    const val = initialValue * Math.exp(-decayLambda * i);
    const x = (i / 39) * 360;
    const y = 140 - (val / initialValue) * 120;
    return { x, y, tick: i, val };
  });

  const pathD = points.reduce(
    (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
    ''
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-10 text-slate-200">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
          <span>Game Mechanics & Mathematical Specifications</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          The exact rules, equations, physics, and state transitions governing the 300-tick match.
        </p>
      </div>

      {/* 1. Interactive Exponential Money Decay Model */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span>1. Money Drop Exponential Decay & Expiration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every drop is subject to continuous value decay. When TTL expires, value drops to $0.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded">
            V(t) = V₀ · e^(-λt)
          </span>
        </div>

        {/* Interactive Sliders & Live Result */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 border border-slate-800/80 rounded-lg">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Initial Value (V₀):</span>
              <strong className="text-white font-mono">${initialValue}</strong>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={initialValue}
              onChange={(e) => setInitialValue(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Leak Rate (λ):</span>
              <strong className="text-white font-mono">{decayLambda.toFixed(3)}</strong>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.050"
              step="0.005"
              value={decayLambda}
              onChange={(e) => setDecayLambda(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Travel Time (Ticks):</span>
              <strong className="text-white font-mono">{elapsedTicks} ticks</strong>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              step="1"
              value={elapsedTicks}
              onChange={(e) => setElapsedTicks(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Dynamic Curve Graph & Readout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 bg-slate-950 p-4 border border-slate-800/80 rounded-lg">
            <div className="flex justify-between text-[11px] text-slate-400 mb-2 font-mono">
              <span>Decay Curve across 40 ticks</span>
              <span className="text-amber-300">
                At t={elapsedTicks}: ${currentValue.toFixed(2)} ({percentRetained}%)
              </span>
            </div>
            <svg viewBox="0 0 380 150" className="w-full h-28">
              {/* Axes */}
              <line x1="10" y1="140" x2="370" y2="140" stroke="#334155" strokeWidth="1" />
              <line x1="10" y1="10" x2="10" y2="140" stroke="#334155" strokeWidth="1" />
              {/* Decay line */}
              <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
              {/* Point on curve for current elapsed ticks */}
              {(() => {
                const curPt = points[Math.min(elapsedTicks, points.length - 1)];
                return (
                  <circle
                    cx={curPt.x}
                    cy={curPt.y}
                    r="4.5"
                    fill="#fbbf24"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                );
              })()}
            </svg>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2 text-xs">
            <span className="text-slate-400">Yield at Arrival:</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ${currentValue.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If a drop is 15 hops away with λ = 0.02, over <strong>26%</strong> of its
              value vanishes during transit alone. Prioritize closer drops or high-initial-value
              spawns.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Police Circular Hazard Zones & Stun Physics */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-4">
        <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>2. Police Hazard Geometry & Stun Mechanics</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Officers are mobile geometric hazard circles defined by continuous positions $(x, y)$,
          velocity $(vx, vy)$, and radius $R$.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded space-y-2">
            <span className="font-semibold text-white">Stun Trigger Condition</span>
            <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
              Euclidean Distance d(Runner, Police) ≤ Radius
            </p>
            <p className="text-slate-400 leading-relaxed">
              When triggered:
              <br />
              • Runner status switches to <code className="text-amber-400">STUNNED</code> for 5 ticks.
              <br />
              • <strong>100% of carried inventory is confiscated and lost</strong>.
              <br />• Stunned runners ignore all strategy commands and default to HOLD.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded space-y-2">
            <span className="font-semibold text-white">Trajectory Extrapolation</span>
            <p className="text-slate-400 leading-relaxed">
              Because officers travel with constant velocity $(vx, vy)$ and bounce elastically off
              the arena boundary box, your bot can accurately forecast officer coordinates 1–3 ticks
              into the future:
            </p>
            <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-slate-300">
              x(t + dt) = x(t) + vx · dt
              <br />
              y(t + dt) = y(t) + vy · dt
            </div>
          </div>
        </div>
      </div>

      {/* 3. Subway Network & Track Maintenance */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-4">
        <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          <span>3. Dynamic Track Maintenance & Traversal</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The subway graph consists of junctions, money spots, and safehouses connected by
          bidirectional tracks.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded">
            <div className="font-semibold text-emerald-400 mb-1">Weight &gt; 0 (Open)</div>
            <p className="text-slate-400 text-[11px]">
              Track is clear. Runners traverse from station to station along connected edges.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded">
            <div className="font-semibold text-rose-400 mb-1">Weight &lt; 0 (Blocked)</div>
            <p className="text-slate-400 text-[11px]">
              Engine sends <code className="text-rose-400">-1.0</code> for tracks closed for
              maintenance. Any attempt to traverse raises an engine warning and forces HOLD.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded">
            <div className="font-semibold text-amber-400 mb-1">1 Hop per Tick</div>
            <p className="text-slate-400 text-[11px]">
              In standard matches, each TRAVERSE step moves to an adjacent neighbor station in 1 tick.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Safehouse Banking Mechanics */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-4">
        <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
          <Award className="w-4 h-4" />
          <span>4. Safehouse Banking & Scoring Strategy</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The winner is determined purely by the total capital safely deposited into safehouses at the
          end of 300 ticks. Carried loot in backpacks at Tick 300 does <strong>not</strong> count
          towards your final score.
        </p>
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1.5 text-slate-300">
          <p>
            <strong>Recommended Banking Heuristics:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
            <li>
              <strong>Deposit Threshold:</strong> Head to a safehouse when carrying{' '}
              <strong className="text-white">≥ 70% of max capacity</strong>.
            </li>
            <li>
              <strong>Match Endgame Flush:</strong> At Tick 275+ (last 25 ticks), all runners carrying
              any loot ($&gt; 0$) should drop everything and rush straight to the closest safehouse to
              bank their loot before Tick 300.
            </li>
            <li>
              <strong>Multi-Agent Coordination:</strong> Assign different runners to different
              quadrants or drops so runners do not waste ticks chasing the same money spot.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
