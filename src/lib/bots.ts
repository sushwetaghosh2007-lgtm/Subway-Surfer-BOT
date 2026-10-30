import {
  Runner,
  MoneyDrop,
  PoliceOfficer,
  GraphNode,
  GraphEdge,
  RunnerAction,
  StrategyConfig,
} from '../types/game';
import {
  buildAdjacency,
  dijkstraWithRisk,
  distance,
  calculateNodeRisk,
} from './pathfinding';

export const BOT_STRATEGIES: StrategyConfig[] = [
  {
    id: 'sota_autonomous',
    name: 'Autonomous Hunter-Banker (Recommended)',
    description:
      'Multi-runner dynamic utility auction, exponential decay discounting, predictive police evasion, and opportunistic safehouse banking.',
    riskAvoidanceWeight: 1.8,
    depositCapacityThreshold: 70, // Deposit if carrying >= 70% capacity
    policeSafetyBuffer: 30,
    futureTrajectoryLookahead: 2,
  },
  {
    id: 'greedy_collector',
    name: 'Greedy Value Maximizer',
    description:
      'Chases highest immediate value drops with minimal risk aversion; high reward but vulnerable to police intercepts.',
    riskAvoidanceWeight: 0.2,
    depositCapacityThreshold: 90,
    policeSafetyBuffer: 10,
    futureTrajectoryLookahead: 1,
  },
  {
    id: 'cautious_banker',
    name: 'Ultra-Defensive Banker',
    description:
      'High police avoidance buffer; deposits carried loot as soon as 35% capacity is filled to protect capital.',
    riskAvoidanceWeight: 3.5,
    depositCapacityThreshold: 35,
    policeSafetyBuffer: 50,
    futureTrajectoryLookahead: 3,
  },
];

/**
 * Execute Strategy implementation - matches the Python bot's strategy() contract
 */
export function executeBotStrategy(
  tick: number,
  nodes: GraphNode[],
  edges: GraphEdge[],
  runners: Runner[],
  drops: MoneyDrop[],
  police: PoliceOfficer[],
  safehouses: number[],
  moneySpots: number[],
  config: StrategyConfig = BOT_STRATEGIES[0]
): RunnerAction[] {
  const actions: RunnerAction[] = [];
  const nodesMap = new Map<number, GraphNode>(nodes.map((n) => [n.id, n]));
  const adjacency = buildAdjacency(nodes, edges);

  // Track claimed drop IDs so multiple runners don't collide on the same target
  const claimedDropIds = new Set<number>();

  for (const runner of runners) {
    if (runner.status === 'STUNNED') {
      actions.push({ runner_id: runner.id, action: 'HOLD' });
      continue;
    }

    const currentNodeId = runner.current_node;
    const currentNode = nodesMap.get(currentNodeId);

    // PRIORITY 1: DEPOSIT if currently on a safehouse and carrying loot
    if (safehouses.includes(currentNodeId) && runner.carrying_loot > 0) {
      actions.push({ runner_id: runner.id, action: 'DEPOSIT' });
      continue;
    }

    // PRIORITY 2: COLLECT if currently on a node with an active drop and runner has capacity
    const dropOnCurrentNode = drops.find(
      (d) => d.node_id === currentNodeId && d.ttl_remaining > 0 && d.current_value > 0
    );
    if (dropOnCurrentNode && runner.carrying_loot < runner.max_capacity) {
      actions.push({ runner_id: runner.id, action: 'COLLECT' });
      claimedDropIds.add(dropOnCurrentNode.drop_id);
      continue;
    }

    // Run Dijkstra from runner's position with police risk penalty
    const { distances, firstHops } = dijkstraWithRisk(
      currentNodeId,
      adjacency,
      nodesMap,
      police,
      config.riskAvoidanceWeight,
      config.policeSafetyBuffer
    );

    // PRIORITY 3: MUST DEPOSIT if carrying loot reaches capacity threshold OR match near end
    const capacityRatio = (runner.carrying_loot / runner.max_capacity) * 100;
    const ticksLeft = 300 - tick;

    let shouldDeposit =
      runner.carrying_loot > 0 &&
      (capacityRatio >= config.depositCapacityThreshold || ticksLeft <= 25);

    if (shouldDeposit && safehouses.length > 0) {
      // Find closest safehouse
      let bestSafehouse: number | null = null;
      let minSafehouseDist = Infinity;

      for (const sh of safehouses) {
        const dist = distances.get(sh) ?? Infinity;
        if (dist < minSafehouseDist) {
          minSafehouseDist = dist;
          bestSafehouse = sh;
        }
      }

      if (bestSafehouse !== null && minSafehouseDist < Infinity) {
        const nextHop = firstHops.get(bestSafehouse);
        if (nextHop !== null && nextHop !== undefined && nextHop !== currentNodeId) {
          actions.push({
            runner_id: runner.id,
            action: 'TRAVERSE',
            target_node: nextHop,
          });
          continue;
        }
      }
    }

    // PRIORITY 4: SELECT BEST DROP via dynamic utility scoring
    let bestDrop: MoneyDrop | null = null;
    let highestUtility = -Infinity;

    const remainingCapacity = runner.max_capacity - runner.carrying_loot;

    for (const drop of drops) {
      if (claimedDropIds.has(drop.drop_id)) continue;
      if (drop.ttl_remaining <= 0 || drop.current_value <= 0) continue;

      const dist = distances.get(drop.node_id);
      if (dist === undefined || dist === Infinity) continue;

      // Estimated arrival time
      const arrivalTick = tick + Math.ceil(dist);
      if (dist > drop.ttl_remaining) continue; // Can't reach before TTL

      // Anticipated decayed value at arrival: V_0 * e^(-lambda * dist)
      const expectedDecayedValue = drop.current_value * Math.exp(-drop.leak_lambda * dist);
      const collectibleAmount = Math.min(expectedDecayedValue, remainingCapacity);

      if (collectibleAmount <= 0) continue;

      // Route-to-safehouse cost after collection
      const dropNode = nodesMap.get(drop.node_id);
      let safehouseReturnDist = 1;
      if (dropNode) {
        // Approximate distance to closest safehouse from drop
        for (const sh of safehouses) {
          const shNode = nodesMap.get(sh);
          if (shNode) {
            const straightDist = distance(dropNode.x, dropNode.y, shNode.x, shNode.y) / 50;
            safehouseReturnDist = Math.min(safehouseReturnDist, straightDist);
          }
        }
      }

      // Utility = (Collectible Loot) / (Travel Time + Return Time + 1)
      const totalEstimatedTicks = dist + safehouseReturnDist + 1;
      const utility = collectibleAmount / totalEstimatedTicks;

      if (utility > highestUtility) {
        highestUtility = utility;
        bestDrop = drop;
      }
    }

    // If profitable drop found, traverse towards it
    if (bestDrop && highestUtility > 0.5) {
      claimedDropIds.add(bestDrop.drop_id);
      const nextHop = firstHops.get(bestDrop.node_id);
      if (nextHop !== null && nextHop !== undefined && nextHop !== currentNodeId) {
        actions.push({
          runner_id: runner.id,
          action: 'TRAVERSE',
          target_node: nextHop,
        });
        continue;
      }
    }

    // PRIORITY 5: If carrying any loot, head to closest safehouse
    if (runner.carrying_loot > 0 && safehouses.length > 0) {
      let bestSafehouse: number | null = null;
      let minSafehouseDist = Infinity;
      for (const sh of safehouses) {
        const dist = distances.get(sh) ?? Infinity;
        if (dist < minSafehouseDist) {
          minSafehouseDist = dist;
          bestSafehouse = sh;
        }
      }
      if (bestSafehouse !== null && minSafehouseDist < Infinity) {
        const nextHop = firstHops.get(bestSafehouse);
        if (nextHop !== null && nextHop !== undefined && nextHop !== currentNodeId) {
          actions.push({
            runner_id: runner.id,
            action: 'TRAVERSE',
            target_node: nextHop,
          });
          continue;
        }
      }
    }

    // PRIORITY 6: Patrol towards nearest money spot with lowest police risk
    let bestMoneySpot: number | null = null;
    let minSpotDist = Infinity;
    for (const spot of moneySpots) {
      const dist = distances.get(spot) ?? Infinity;
      if (dist < minSpotDist) {
        minSpotDist = dist;
        bestMoneySpot = spot;
      }
    }

    if (bestMoneySpot !== null && minSpotDist < Infinity) {
      const nextHop = firstHops.get(bestMoneySpot);
      if (nextHop !== null && nextHop !== undefined && nextHop !== currentNodeId) {
        actions.push({
          runner_id: runner.id,
          action: 'TRAVERSE',
          target_node: nextHop,
        });
        continue;
      }
    }

    // Default fallback: check if current node is dangerous; if so, flee to safest neighbor
    if (currentNode) {
      const currentRisk = calculateNodeRisk(currentNode, police, config.policeSafetyBuffer);
      if (currentRisk > 10) {
        const neighbors = adjacency.get(currentNodeId) || [];
        let safestNeighbor: number | null = null;
        let lowestNeighborRisk = currentRisk;

        for (const n of neighbors) {
          const neighborNode = nodesMap.get(n.nodeId);
          if (neighborNode) {
            const nRisk = calculateNodeRisk(neighborNode, police, config.policeSafetyBuffer);
            if (nRisk < lowestNeighborRisk) {
              lowestNeighborRisk = nRisk;
              safestNeighbor = n.nodeId;
            }
          }
        }

        if (safestNeighbor !== null) {
          actions.push({
            runner_id: runner.id,
            action: 'TRAVERSE',
            target_node: safestNeighbor,
          });
          continue;
        }
      }
    }

    // Safe idle
    actions.push({ runner_id: runner.id, action: 'HOLD' });
  }

  return actions;
}
