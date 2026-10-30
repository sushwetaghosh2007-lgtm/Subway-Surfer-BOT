import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  Shield,
  Coins,
  AlertTriangle,
  Radio,
  Sliders,
  Maximize2,
  Info,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  GraphNode,
  GraphEdge,
  Runner,
  MoneyDrop,
  PoliceOfficer,
  RunnerAction,
} from '../types/game';
import {
  GameEngineState,
  createInitialEngineState,
  stepEngineTick,
} from '../lib/engine';
import { MAP_PRESETS, MapPreset, TOTAL_TICKS } from '../lib/constants';
import { BOT_STRATEGIES, executeBotStrategy } from '../lib/bots';
import { calculateNodeRisk } from '../lib/pathfinding';

interface ArenaSimulatorProps {
  onEngineTickUpdate?: (tick: number, banked: number) => void;
}

export const ArenaSimulator: React.FC<ArenaSimulatorProps> = ({
  onEngineTickUpdate,
}) => {
  const [selectedMap, setSelectedMap] = useState<MapPreset>(MAP_PRESETS[0]);
  const [strategyIndex, setStrategyIndex] = useState(0);
  const currentStrategy = BOT_STRATEGIES[strategyIndex];

  // Engine state
  const [engineState, setEngineState] = useState<GameEngineState>(() =>
    createInitialEngineState(selectedMap)
  );

  // Playback controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'node' | 'runner' | 'drop' | 'police';
    id: number;
  } | null>(null);

  const speedIntervals: Record<number, number> = {
    1: 450,
    2: 220,
    5: 90,
    10: 35,
  };

  // Keep parent updated on state
  useEffect(() => {
    onEngineTickUpdate?.(engineState.tick, engineState.stats.totalBanked);
  }, [engineState.tick, engineState.stats.totalBanked, onEngineTickUpdate]);

  // Reset engine when map preset changes
  const handleMapChange = (map: MapPreset) => {
    setIsPlaying(false);
    setSelectedMap(map);
    const newInitial = createInitialEngineState(map);
    setEngineState(newInitial);
    setSelectedEntity(null);
  };

  const handleReset = () => {
    setIsPlaying(false);
    const resetState = createInitialEngineState(selectedMap);
    setEngineState(resetState);
  };

  // Perform one tick advancement
  const stepTick = () => {
    setEngineState((prev) => {
      if (prev.tick >= TOTAL_TICKS || prev.isFinished) {
        setIsPlaying(false);
        return prev;
      }

      // Compute actions via strategy
      const actions = executeBotStrategy(
        prev.tick,
        prev.nodes,
        prev.edges,
        prev.runners,
        prev.drops,
        prev.police,
        prev.safehouses,
        prev.moneySpots,
        currentStrategy
      );

      return stepEngineTick(prev, actions, selectedMap);
    });
  };

  // Auto-play interval loop
  useEffect(() => {
    if (!isPlaying) return;

    if (engineState.tick >= TOTAL_TICKS || engineState.isFinished) {
      setIsPlaying(false);
      return;
    }

    const interval = setInterval(() => {
      stepTick();
    }, speedIntervals[playbackSpeed] || 200);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, engineState.tick, engineState.isFinished, currentStrategy]);

  // Fast forward to end of 300 ticks
  const handleFastForwardToEnd = () => {
    setIsPlaying(false);
    setEngineState((curr) => {
      let state = curr;
      while (state.tick < TOTAL_TICKS && !state.isFinished) {
        const actions = executeBotStrategy(
          state.tick,
          state.nodes,
          state.edges,
          state.runners,
          state.drops,
          state.police,
          state.safehouses,
          state.moneySpots,
          currentStrategy
        );
        state = stepEngineTick(state, actions, selectedMap);
      }
      return state;
    });
  };

  // Inspector data
  const inspectedData = () => {
    if (!selectedEntity) return null;
    const { type, id } = selectedEntity;
    if (type === 'node') {
      const node = engineState.nodes.find((n) => n.id === id);
      if (!node) return null;
      const risk = calculateNodeRisk(node, engineState.police);
      const connectedEdges = engineState.edges.filter(
        (e) => e.from === id || e.to === id
      );
      return {
        title: `Node #${node.id} (${node.type.toUpperCase()})`,
        subtitle: node.label || 'Subway Station',
        details: [
          { label: 'Coordinates', value: `X: ${node.x.toFixed(0)}, Y: ${node.y.toFixed(0)}` },
          { label: 'Type', value: node.type },
          { label: 'Police Hazard Risk', value: `${risk.toFixed(1)} / 50` },
          { label: 'Connected Tracks', value: `${connectedEdges.length} connections` },
        ],
      };
    }
    if (type === 'runner') {
      const runner = engineState.runners.find((r) => r.id === id);
      if (!runner) return null;
      return {
        title: `Runner #${runner.id}`,
        subtitle: `Status: ${runner.status}`,
        details: [
          { label: 'Current Station', value: `Node #${runner.current_node}` },
          {
            label: 'Carrying Loot',
            value: `$${runner.carrying_loot.toFixed(2)} / $${runner.max_capacity}`,
          },
          {
            label: 'Capacity Fill',
            value: `${((runner.carrying_loot / runner.max_capacity) * 100).toFixed(0)}%`,
          },
          {
            label: 'Stun Ticks Remaining',
            value: `${runner.stun_ticks_remaining} ticks`,
          },
        ],
      };
    }
    if (type === 'drop') {
      const drop = engineState.drops.find((d) => d.drop_id === id);
      if (!drop) return null;
      return {
        title: `Money Drop #${drop.drop_id}`,
        subtitle: `Located at Spot #${drop.node_id}`,
        details: [
          { label: 'Current Value', value: `$${drop.current_value.toFixed(2)}` },
          { label: 'Initial Spawn Value', value: `$${drop.initial_value.toFixed(2)}` },
          { label: 'Decay Rate (λ)', value: `${drop.leak_lambda.toFixed(4)} / tick` },
          { label: 'TTL Remaining', value: `${drop.ttl_remaining} ticks` },
          { label: 'Target Safehouse', value: `Safehouse #${drop.target_safehouse_node}` },
        ],
      };
    }
    if (type === 'police') {
      const p = engineState.police.find((pol) => pol.id === id);
      if (!p) return null;
      return {
        title: `Police Officer #${p.id}`,
        subtitle: 'Mobile Hazard Zone',
        details: [
          { label: 'Position', value: `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})` },
          { label: 'Velocity Vector', value: `vx: ${p.vx.toFixed(2)}, vy: ${p.vy.toFixed(2)}` },
          { label: 'Hazard Radius', value: `${p.radius.toFixed(0)}px` },
        ],
      };
    }
    return null;
  };

  const entityInfo = inspectedData();

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Banked Capital</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            ${engineState.stats.totalBanked.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {engineState.stats.depositsCount} safehouse deposits
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Carried Loot</span>
            <Coins className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-300 font-mono tabular-nums">
            ${engineState.stats.totalCarrying.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {engineState.stats.collectionsCount} drops collected
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lost to Police Stuns</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-400 font-mono tabular-nums">
            ${engineState.stats.totalLostStuns.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {engineState.stats.stunsCount} stun intercepts
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lost to TTL Decay</span>
            <Radio className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-300 font-mono tabular-nums">
            ${engineState.stats.totalLostDecayOrExpiry.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Expired uncollected</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Match Progress</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-sky-300 font-mono tabular-nums">
            {engineState.tick} <span className="text-sm text-slate-500">/ 300</span>
          </div>
          <div className="mt-1 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-sky-400 h-full transition-all duration-150"
              style={{ width: `${(engineState.tick / TOTAL_TICKS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Simulation Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Visualizer Canvas & Timeline (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
            {/* Playback Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isPlaying
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Live'}</span>
              </button>

              <button
                onClick={stepTick}
                disabled={isPlaying || engineState.tick >= TOTAL_TICKS}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-md text-xs font-medium transition-colors"
                title="Advance 1 Tick"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Step Tick</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition-colors"
                title="Reset Match"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleFastForwardToEnd}
                disabled={engineState.tick >= TOTAL_TICKS}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 rounded-md text-xs font-medium transition-colors"
                title="Simulate all 300 ticks immediately"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Finish 300 Ticks</span>
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 mr-1">Speed:</span>
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                    playbackSpeed === s
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Map Preset Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Map:</span>
              <select
                value={selectedMap.id}
                onChange={(e) => {
                  const found = MAP_PRESETS.find((m) => m.id === e.target.value);
                  if (found) handleMapChange(found);
                }}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
              >
                {MAP_PRESETS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SVG Canvas Map Visualizer */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-inner flex items-center justify-center min-h-[500px]">
            {/* Visualizer Legend overlay in top right */}
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800/80 rounded-md p-2.5 text-[11px] text-slate-300 space-y-1.5 pointer-events-none z-10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Safehouse (Bank Loot)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Money Spot (Spawn / Decay)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                <span>Junction Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span>Runner (Carrying Loot)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Police Hazard Circle (Radius R)</span>
              </div>
            </div>

            <svg
              viewBox="0 0 760 560"
              className="w-full h-auto select-none max-h-[540px]"
            >
              <defs>
                {/* Radial gradients for police radar */}
                <radialGradient id="policeHazardGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="85%" stopColor="#ef4444" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </radialGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background subtle dots */}
              <pattern id="gridDots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="1" fill="#334155" opacity="0.4" />
              </pattern>
              <rect width="760" height="560" fill="url(#gridDots)" />

              {/* 1. Subway Tracks (Edges) */}
              {engineState.edges.map((edge, idx) => {
                const fromNode = engineState.nodes.find((n) => n.id === edge.from);
                const toNode = engineState.nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const isBlocked = edge.current_weight < 0 || edge.current_weight === Infinity;
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;

                return (
                  <g key={`edge-${idx}`}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isBlocked ? '#ef4444' : '#475569'}
                      strokeWidth={isBlocked ? 2.5 : 2}
                      strokeDasharray={isBlocked ? '5,5' : 'none'}
                      opacity={isBlocked ? 0.9 : 0.6}
                    />
                    {/* Weight tag pill */}
                    <rect
                      x={midX - 10}
                      y={midY - 7}
                      width={20}
                      height={14}
                      rx={3}
                      fill="#0f172a"
                      stroke={isBlocked ? '#ef4444' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      fill={isBlocked ? '#ef4444' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {isBlocked ? 'X' : edge.current_weight}
                    </text>
                  </g>
                );
              })}

              {/* 2. Police Hazard Circles & Officers */}
              {engineState.police.map((p) => (
                <g
                  key={`police-${p.id}`}
                  onClick={() => setSelectedEntity({ type: 'police', id: p.id })}
                  className="cursor-pointer"
                >
                  {/* Danger zone radius */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius}
                    fill="url(#policeHazardGrad)"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    opacity={0.85}
                  />

                  {/* Velocity trajectory line */}
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={p.x + p.vx * 6}
                    y2={p.y + p.vy * 6}
                    stroke="#f87171"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={p.x + p.vx * 6}
                    cy={p.y + p.vy * 6}
                    r={2.5}
                    fill="#f87171"
                  />

                  {/* Police Badge Center Marker */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11}
                    fill="#dc2626"
                    stroke="#fee2e2"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x}
                    y={p.y + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    P{p.id}
                  </text>
                </g>
              ))}

              {/* 3. Subway Stations (Nodes) */}
              {engineState.nodes.map((node) => {
                const isSafehouse = node.type === 'safehouse';
                const isMoneySpot = node.type === 'money_spot';
                const isSelected =
                  selectedEntity?.type === 'node' && selectedEntity.id === node.id;

                let fillColor = '#334155';
                let strokeColor = '#64748b';
                let iconSymbol = `${node.id}`;

                if (isSafehouse) {
                  fillColor = '#065f46';
                  strokeColor = '#10b981';
                  iconSymbol = `S${node.id}`;
                } else if (isMoneySpot) {
                  fillColor = '#78350f';
                  strokeColor = '#f59e0b';
                  iconSymbol = `M${node.id}`;
                }

                return (
                  <g
                    key={`node-${node.id}`}
                    onClick={() => setSelectedEntity({ type: 'node', id: node.id })}
                    className="cursor-pointer group"
                  >
                    {/* Active highlight ring */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={18}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="3,3"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={13}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={2}
                      className="transition-transform group-hover:scale-110"
                    />

                    <text
                      x={node.x}
                      y={node.y + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {iconSymbol}
                    </text>

                    {/* Node Label underneath */}
                    <text
                      x={node.x}
                      y={node.y + 23}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="500"
                    >
                      {node.label || `Node ${node.id}`}
                    </text>
                  </g>
                );
              })}

              {/* 4. Money Drops at Nodes with decay values & TTL bar */}
              {engineState.drops.map((drop) => {
                const node = engineState.nodes.find((n) => n.id === drop.node_id);
                if (!node) return null;

                const ttlRatio = Math.max(0, drop.ttl_remaining / 40);

                return (
                  <g
                    key={`drop-${drop.drop_id}`}
                    onClick={() => setSelectedEntity({ type: 'drop', id: drop.drop_id })}
                    className="cursor-pointer"
                  >
                    {/* Pulsing Drop Halo */}
                    <circle
                      cx={node.x}
                      cy={node.y - 24}
                      r={13}
                      fill="#fbbf24"
                      fillOpacity={0.2}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      filter="url(#glow)"
                    />

                    {/* Drop Badge */}
                    <rect
                      x={node.x - 22}
                      y={node.y - 32}
                      width={44}
                      height={16}
                      rx={8}
                      fill="#1e293b"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                    />
                    <text
                      x={node.x}
                      y={node.y - 21}
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ${drop.current_value.toFixed(1)}
                    </text>

                    {/* Mini TTL indicator line */}
                    <line
                      x1={node.x - 18}
                      y1={node.y - 14}
                      x2={node.x - 18 + 36 * Math.min(1, ttlRatio)}
                      y2={node.y - 14}
                      stroke={ttlRatio > 0.3 ? '#10b981' : '#f43f5e'}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {/* 5. Autonomous Runners */}
              {engineState.runners.map((runner) => {
                const isStunned = runner.status === 'STUNNED';
                const isSelected =
                  selectedEntity?.type === 'runner' && selectedEntity.id === runner.id;

                return (
                  <g
                    key={`runner-${runner.id}`}
                    onClick={() => setSelectedEntity({ type: 'runner', id: runner.id })}
                    className="cursor-pointer"
                  >
                    {/* Stun warning burst */}
                    {isStunned && (
                      <circle
                        cx={runner.x}
                        cy={runner.y}
                        r={20}
                        fill="#f59e0b"
                        fillOpacity={0.3}
                        stroke="#eab308"
                        strokeWidth={2}
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Runner Avatar Diamond */}
                    <rect
                      x={runner.x - 9}
                      y={runner.y - 9}
                      width={18}
                      height={18}
                      rx={3}
                      transform={`rotate(45, ${runner.x}, ${runner.y})`}
                      fill={isStunned ? '#d97706' : '#0284c7'}
                      stroke={isStunned ? '#fef08a' : '#38bdf8'}
                      strokeWidth={2}
                    />

                    <text
                      x={runner.x}
                      y={runner.y + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      R{runner.id}
                    </text>

                    {/* Carrying Loot Badge above runner */}
                    {runner.carrying_loot > 0 && (
                      <g>
                        <rect
                          x={runner.x - 16}
                          y={runner.y - 26}
                          width={32}
                          height={12}
                          rx={3}
                          fill="#0f172a"
                          stroke="#38bdf8"
                          strokeWidth={1}
                        />
                        <text
                          x={runner.x}
                          y={runner.y - 17}
                          textAnchor="middle"
                          fill="#7dd3fc"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          ${runner.carrying_loot.toFixed(0)}
                        </text>
                      </g>
                    )}

                    {/* Stun countdown label */}
                    {isStunned && (
                      <text
                        x={runner.x}
                        y={runner.y + 22}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        STUN({runner.stun_ticks_remaining})
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sidebar: Strategy selector, Entity Inspector, and Event Log (1 col) */}
        <div className="flex flex-col gap-3">
          {/* Strategy Selection Card */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Active Bot Strategy</span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <select
              value={strategyIndex}
              onChange={(e) => setStrategyIndex(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            >
              {BOT_STRATEGIES.map((strat, idx) => (
                <option key={strat.id} value={idx}>
                  {strat.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              {currentStrategy.description}
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
              <div>
                Risk Weight (α):{' '}
                <strong className="text-amber-300">{currentStrategy.riskAvoidanceWeight}x</strong>
              </div>
              <div>
                Deposit Cap:{' '}
                <strong className="text-amber-300">
                  {currentStrategy.depositCapacityThreshold}%
                </strong>
              </div>
            </div>
          </div>

          {/* Interactive Entity Inspector Drawer */}
          {entityInfo ? (
            <div className="p-3.5 bg-slate-900/90 border border-amber-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-300">{entityInfo.title}</h4>
                  <p className="text-[11px] text-slate-400">{entityInfo.subtitle}</p>
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-xs text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                {entityInfo.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{d.label}:</span>
                    <span className="font-mono text-[11px] text-slate-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900/40 border border-dashed border-slate-800 rounded-lg text-center">
              <p className="text-xs text-slate-500">
                Click any node, runner, money drop, or police officer to inspect real-time variables.
              </p>
            </div>
          )}

          {/* Live Tick Event Log */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Live Match Log</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {engineState.eventLogs.length} events
              </span>
            </div>
            <div className="overflow-y-auto max-h-56 space-y-1.5 pr-1 text-[11px] font-mono">
              {engineState.eventLogs.map((log) => {
                let badgeColor = 'text-slate-400';
                if (log.type === 'DEPOSIT') badgeColor = 'text-emerald-400 font-semibold';
                if (log.type === 'COLLECT') badgeColor = 'text-amber-300';
                if (log.type === 'STUN') badgeColor = 'text-rose-400 font-semibold';
                if (log.type === 'EXPIRE') badgeColor = 'text-slate-500';
                if (log.type === 'BLOCKED_EDGE') badgeColor = 'text-yellow-400';

                return (
                  <div key={log.id} className="leading-tight py-0.5 border-b border-slate-800/40">
                    <span className="text-slate-600 mr-1.5">[{log.tick.toString().padStart(3, '0')}]</span>
                    <span className={badgeColor}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
