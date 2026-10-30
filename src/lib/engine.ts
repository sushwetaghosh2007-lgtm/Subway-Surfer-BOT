import {
  GraphNode,
  GraphEdge,
  Runner,
  MoneyDrop,
  PoliceOfficer,
  RunnerAction,
  TickEventLog,
  MatchTelemetry,
} from '../types/game';
import { distance } from './pathfinding';
import { STUN_DURATION, TOTAL_TICKS, MapPreset } from './constants';

export interface GameEngineState {
  tick: number;
  isFinished: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  runners: Runner[];
  drops: MoneyDrop[];
  police: PoliceOfficer[];
  safehouses: number[];
  moneySpots: number[];
  eventLogs: TickEventLog[];
  telemetryHistory: MatchTelemetry[];
  stats: {
    totalBanked: number;
    totalCarrying: number;
    totalLostStuns: number;
    totalLostDecayOrExpiry: number;
    stunsCount: number;
    collectionsCount: number;
    depositsCount: number;
    totalDropValueSpawned: number;
  };
}

export function createInitialEngineState(mapPreset: MapPreset): GameEngineState {
  const nodes = mapPreset.nodes.map((n) => ({ ...n }));
  const edges = mapPreset.edges.map((e) => ({ ...e }));
  const runners = mapPreset.initialRunners.map((r) => ({ ...r }));
  const police = mapPreset.initialPolice.map((p) => ({ ...p }));

  const safehouses = nodes.filter((n) => n.type === 'safehouse').map((n) => n.id);
  const moneySpots = nodes.filter((n) => n.type === 'money_spot').map((n) => n.id);

  // Seed 2-3 initial money drops
  const initialDrops: MoneyDrop[] = [];
  const candidateSpots = [...moneySpots].slice(0, 3);
  candidateSpots.forEach((spotId, idx) => {
    const val = 60 + idx * 25;
    const targetSh = safehouses[idx % safehouses.length];
    initialDrops.push({
      drop_id: idx + 1,
      node_id: spotId,
      target_safehouse_node: targetSh,
      initial_value: val,
      current_value: val,
      leak_lambda: 0.015,
      ttl_remaining: 35,
      spawn_tick: 0,
    });
  });

  const initialTelemetry: MatchTelemetry = {
    tick: 0,
    total_banked: 0,
    total_carrying: 0,
    total_lost_stuns: 0,
    total_lost_decay_or_expiry: 0,
    stuns_count: 0,
    collections_count: 0,
    deposits_count: 0,
    avg_tick_latency_ms: 1.2,
  };

  return {
    tick: 0,
    isFinished: false,
    nodes,
    edges,
    runners,
    drops: initialDrops,
    police,
    safehouses,
    moneySpots,
    eventLogs: [
      {
        id: 'init-0',
        tick: 0,
        type: 'INFO',
        message: `Match initialized on ${mapPreset.name}. Runners: ${runners.length}, Safehouses: ${safehouses.length}.`,
      },
    ],
    telemetryHistory: [initialTelemetry],
    stats: {
      totalBanked: 0,
      totalCarrying: 0,
      totalLostStuns: 0,
      totalLostDecayOrExpiry: 0,
      stunsCount: 0,
      collectionsCount: 0,
      depositsCount: 0,
      totalDropValueSpawned: initialDrops.reduce((acc, d) => acc + d.initial_value, 0),
    },
  };
}

let nextDropIdCounter = 10;

/**
 * Advance the game engine by 1 tick given runner actions
 */
export function stepEngineTick(
  state: GameEngineState,
  actions: RunnerAction[],
  mapPreset: MapPreset
): GameEngineState {
  if (state.tick >= TOTAL_TICKS || state.isFinished) {
    return { ...state, isFinished: true };
  }

  const nextTick = state.tick + 1;
  const newLogs: TickEventLog[] = [];

  const nodesMap = new Map<number, GraphNode>(state.nodes.map((n) => [n.id, n]));
  const runners: Runner[] = state.runners.map((r) => ({ ...r }));
  let drops: MoneyDrop[] = state.drops.map((d) => ({ ...d }));
  const police: PoliceOfficer[] = state.police.map((p) => ({ ...p }));
  const edges: GraphEdge[] = state.edges.map((e) => ({ ...e }));

  let totalBanked = state.stats.totalBanked;
  let totalLostStuns = state.stats.totalLostStuns;
  let totalLostDecayOrExpiry = state.stats.totalLostDecayOrExpiry;
  let stunsCount = state.stats.stunsCount;
  let collectionsCount = state.stats.collectionsCount;
  let depositsCount = state.stats.depositsCount;
  let totalDropValueSpawned = state.stats.totalDropValueSpawned;

  // 1. Process stunned countdown
  for (const runner of runners) {
    if (runner.status === 'STUNNED') {
      runner.stun_ticks_remaining -= 1;
      if (runner.stun_ticks_remaining <= 0) {
        runner.status = 'ACTIVE';
        runner.stun_ticks_remaining = 0;
        newLogs.push({
          id: `recov-${nextTick}-${runner.id}`,
          tick: nextTick,
          type: 'INFO',
          runner_id: runner.id,
          message: `Runner #${runner.id} recovered from stun. Systems active.`,
        });
      }
    }
  }

  // 2. Process Actions for ACTIVE runners
  const actionByRunner = new Map<number, RunnerAction>(
    actions.map((a) => [a.runner_id, a])
  );

  for (const runner of runners) {
    if (runner.status === 'STUNNED') continue;

    const action = actionByRunner.get(runner.id);
    if (!action) continue;

    if (action.action === 'DEPOSIT') {
      if (state.safehouses.includes(runner.current_node) && runner.carrying_loot > 0) {
        const deposited = Math.round(runner.carrying_loot * 100) / 100;
        totalBanked += deposited;
        depositsCount += 1;
        runner.carrying_loot = 0;
        newLogs.push({
          id: `dep-${nextTick}-${runner.id}`,
          tick: nextTick,
          type: 'DEPOSIT',
          runner_id: runner.id,
          node_id: runner.current_node,
          amount: deposited,
          message: `Runner #${runner.id} banked $${deposited.toFixed(2)} at Safehouse #${runner.current_node}.`,
        });
      }
    } else if (action.action === 'COLLECT') {
      const dropIndex = drops.findIndex(
        (d) => d.node_id === runner.current_node && d.ttl_remaining > 0
      );
      if (dropIndex !== -1) {
        const drop = drops[dropIndex];
        const capacityAvailable = runner.max_capacity - runner.carrying_loot;
        if (capacityAvailable > 0) {
          const collectAmount = Math.min(drop.current_value, capacityAvailable);
          const roundedAmount = Math.round(collectAmount * 100) / 100;
          runner.carrying_loot += roundedAmount;
          collectionsCount += 1;

          if (collectAmount >= drop.current_value - 0.5) {
            // Drop depleted
            drops.splice(dropIndex, 1);
          } else {
            drop.current_value -= collectAmount;
          }

          newLogs.push({
            id: `col-${nextTick}-${runner.id}`,
            tick: nextTick,
            type: 'COLLECT',
            runner_id: runner.id,
            node_id: runner.current_node,
            amount: roundedAmount,
            message: `Runner #${runner.id} collected $${roundedAmount.toFixed(2)} at Spot #${runner.current_node}.`,
          });
        }
      }
    } else if (action.action === 'TRAVERSE' && action.target_node !== undefined) {
      const targetId = action.target_node;
      // Validate edge exists and is not blocked
      const edge = edges.find(
        (e) =>
          ((e.from === runner.current_node && e.to === targetId) ||
            (e.to === runner.current_node && e.from === targetId)) &&
          e.current_weight > 0 &&
          e.current_weight < Infinity
      );

      if (edge) {
        const targetNode = nodesMap.get(targetId);
        if (targetNode) {
          runner.current_node = targetId;
          runner.x = targetNode.x;
          runner.y = targetNode.y;
        }
      }
    }
  }

  // 3. Update Money Drops: exponential decay V(t) = V_0 * e^(-lambda * dt) and TTL
  const survivingDrops: MoneyDrop[] = [];
  for (const drop of drops) {
    drop.ttl_remaining -= 1;
    // Exponential decay formulation
    drop.current_value = Math.max(
      0,
      drop.initial_value * Math.exp(-drop.leak_lambda * (nextTick - drop.spawn_tick))
    );

    if (drop.ttl_remaining <= 0 || drop.current_value < 1.0) {
      totalLostDecayOrExpiry += drop.current_value;
      newLogs.push({
        id: `exp-${nextTick}-${drop.drop_id}`,
        tick: nextTick,
        type: 'EXPIRE',
        node_id: drop.node_id,
        amount: Math.round(drop.current_value * 100) / 100,
        message: `Drop #${drop.drop_id} expired at Spot #${drop.node_id} (lost $${drop.current_value.toFixed(1)}).`,
      });
    } else {
      survivingDrops.push(drop);
    }
  }
  drops = survivingDrops;

  // 4. Periodic Drop Spawning at vacant money spots
  if (nextTick % mapPreset.dropInterval === 0 && drops.length < 5) {
    const occupiedSpotIds = new Set(drops.map((d) => d.node_id));
    const availableSpots = state.moneySpots.filter((id) => !occupiedSpotIds.has(id));

    if (availableSpots.length > 0) {
      const chosenSpot = availableSpots[Math.floor(Math.random() * availableSpots.length)];
      const spawnValue = 40 + Math.floor(Math.random() * 80);
      const targetSh =
        state.safehouses[Math.floor(Math.random() * state.safehouses.length)];
      const leakRate = 0.01 + Math.random() * 0.02; // 0.01 to 0.03
      const ttl = 25 + Math.floor(Math.random() * 25); // 25 to 50 ticks

      const newDrop: MoneyDrop = {
        drop_id: ++nextDropIdCounter,
        node_id: chosenSpot,
        target_safehouse_node: targetSh,
        initial_value: spawnValue,
        current_value: spawnValue,
        leak_lambda: leakRate,
        ttl_remaining: ttl,
        spawn_tick: nextTick,
      };

      drops.push(newDrop);
      totalDropValueSpawned += spawnValue;

      newLogs.push({
        id: `spw-${nextTick}-${newDrop.drop_id}`,
        tick: nextTick,
        type: 'SPAWN',
        node_id: chosenSpot,
        amount: spawnValue,
        message: `New drop ($${spawnValue}) appeared at Spot #${chosenSpot} (TTL: ${ttl} ticks).`,
      });
    }
  }

  // 5. Update Police positions with arena bounds reflection
  const bounds = { minX: 80, maxX: 680, minY: 80, maxY: 510 };
  for (const p of police) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x <= bounds.minX) {
      p.x = bounds.minX;
      p.vx = Math.abs(p.vx);
    } else if (p.x >= bounds.maxX) {
      p.x = bounds.maxX;
      p.vx = -Math.abs(p.vx);
    }

    if (p.y <= bounds.minY) {
      p.y = bounds.minY;
      p.vy = Math.abs(p.vy);
    } else if (p.y >= bounds.maxY) {
      p.y = bounds.maxY;
      p.vy = -Math.abs(p.vy);
    }
  }

  // 6. Check Police Stun Collisions
  for (const runner of runners) {
    if (runner.status === 'STUNNED') continue;

    for (const p of police) {
      const d = distance(runner.x, runner.y, p.x, p.y);
      if (d <= p.radius) {
        runner.status = 'STUNNED';
        runner.stun_ticks_remaining = STUN_DURATION;
        stunsCount += 1;

        const lost = Math.round(runner.carrying_loot * 100) / 100;
        totalLostStuns += lost;
        runner.carrying_loot = 0;

        newLogs.push({
          id: `stn-${nextTick}-${runner.id}`,
          tick: nextTick,
          type: 'STUN',
          runner_id: runner.id,
          amount: lost,
          message: `POLICE INTERCEPT! Runner #${runner.id} stunned by Officer #${p.id} (lost $${lost.toFixed(2)}, immobilized ${STUN_DURATION} ticks).`,
        });
        break;
      }
    }
  }

  // 7. Dynamic Edge Maintenance (occasional track block/unblock)
  if (nextTick % 40 === 0 && edges.length > 0) {
    // Randomly toggle a non-critical edge
    const edgeIdx = Math.floor(Math.random() * edges.length);
    const targetEdge = edges[edgeIdx];
    if (targetEdge.current_weight > 0 && targetEdge.current_weight < Infinity) {
      targetEdge.current_weight = -1; // Blocked
      newLogs.push({
        id: `blk-${nextTick}-${edgeIdx}`,
        tick: nextTick,
        type: 'BLOCKED_EDGE',
        message: `Subway maintenance: Track between Node #${targetEdge.from} and #${targetEdge.to} is BLOCKED (-1).`,
      });
    } else if (targetEdge.current_weight === -1) {
      targetEdge.current_weight = 2; // Restored
      newLogs.push({
        id: `rst-${nextTick}-${edgeIdx}`,
        tick: nextTick,
        type: 'INFO',
        message: `Track between Node #${targetEdge.from} and #${targetEdge.to} has reopened (weight 2).`,
      });
    }
  }

  const currentCarrying = runners.reduce((acc, r) => acc + r.carrying_loot, 0);

  const telemetry: MatchTelemetry = {
    tick: nextTick,
    total_banked: Math.round(totalBanked * 100) / 100,
    total_carrying: Math.round(currentCarrying * 100) / 100,
    total_lost_stuns: Math.round(totalLostStuns * 100) / 100,
    total_lost_decay_or_expiry: Math.round(totalLostDecayOrExpiry * 100) / 100,
    stuns_count: stunsCount,
    collections_count: collectionsCount,
    deposits_count: depositsCount,
    avg_tick_latency_ms: 1.8 + Math.random() * 0.8,
  };

  const isFinished = nextTick >= TOTAL_TICKS;
  if (isFinished) {
    newLogs.push({
      id: `finish-${nextTick}`,
      tick: nextTick,
      type: 'INFO',
      message: `Match finished! Total capital banked: $${totalBanked.toFixed(2)} in 300 ticks.`,
    });
  }

  return {
    ...state,
    tick: nextTick,
    isFinished,
    runners,
    drops,
    police,
    edges,
    eventLogs: [...newLogs, ...state.eventLogs].slice(0, 80),
    telemetryHistory: [...state.telemetryHistory, telemetry],
    stats: {
      totalBanked,
      totalCarrying: currentCarrying,
      totalLostStuns,
      totalLostDecayOrExpiry,
      stunsCount,
      collectionsCount,
      depositsCount,
      totalDropValueSpawned,
    },
  };
}
