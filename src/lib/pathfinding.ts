import { GraphNode, PoliceOfficer } from '../types/game';

export interface NeighborInfo {
  nodeId: number;
  weight: number;
}

export type AdjacencyMap = Map<number, NeighborInfo[]>;

export function buildAdjacency(
  nodes: GraphNode[],
  edges: { from: number; to: number; current_weight: number }[]
): AdjacencyMap {
  const adj: AdjacencyMap = new Map();
  for (const n of nodes) {
    adj.set(n.id, []);
  }

  for (const e of edges) {
    // If weight < 0 or is Infinity, edge is blocked
    if (e.current_weight > 0 && e.current_weight < Infinity) {
      adj.get(e.from)?.push({ nodeId: e.to, weight: e.current_weight });
      adj.get(e.to)?.push({ nodeId: e.from, weight: e.current_weight });
    }
  }

  return adj;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Predict where a police officer will be in `ticks` steps given their velocity,
 * with elastic reflection off the arena bounding box.
 */
export function predictPolice(
  p: PoliceOfficer,
  ticksAhead: number,
  bounds = { minX: 60, maxX: 700, minY: 60, maxY: 520 }
): { x: number; y: number } {
  let x = p.x + p.vx * ticksAhead;
  let y = p.y + p.vy * ticksAhead;

  // Simple reflection logic
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  let relX = (x - bounds.minX) % (2 * width);
  if (relX < 0) relX += 2 * width;
  x = relX > width ? bounds.maxX - (relX - width) : bounds.minX + relX;

  let relY = (y - bounds.minY) % (2 * height);
  if (relY < 0) relY += 2 * height;
  y = relY > height ? bounds.maxY - (relY - height) : bounds.minY + relY;

  return { x, y };
}

/**
 * Evaluates the police hazard risk score at a given node
 */
export function calculateNodeRisk(
  node: GraphNode,
  policeOfficers: PoliceOfficer[],
  safetyBuffer = 20,
  lookaheadTicks = 1
): number {
  let maxRisk = 0;

  for (const p of policeOfficers) {
    // Evaluate current and future police positions
    for (let t = 0; t <= lookaheadTicks; t++) {
      const pred = t === 0 ? { x: p.x, y: p.y } : predictPolice(p, t);
      const dist = distance(node.x, node.y, pred.x, pred.y);
      const dangerZone = p.radius + safetyBuffer;

      if (dist <= dangerZone) {
        // High risk if inside or near hazard zone
        const proximityFactor = Math.max(0.1, (dangerZone - dist) / dangerZone + 1.0);
        const penalty = proximityFactor * 40;
        if (penalty > maxRisk) {
          maxRisk = penalty;
        }
      }
    }
  }

  return maxRisk;
}

/**
 * Dijkstra's algorithm supporting edge weights and dynamic police hazard penalty fields
 */
export function dijkstraWithRisk(
  startNodeId: number,
  adjacency: AdjacencyMap,
  nodesMap: Map<number, GraphNode>,
  policeOfficers: PoliceOfficer[] = [],
  riskWeight = 1.0,
  safetyBuffer = 25
): {
  distances: Map<number, number>;
  previous: Map<number, number | null>;
  firstHops: Map<number, number | null>;
} {
  const distances = new Map<number, number>();
  const previous = new Map<number, number | null>();
  const firstHops = new Map<number, number | null>();
  const unvisited = new Set<number>();

  for (const id of adjacency.keys()) {
    distances.set(id, Infinity);
    previous.set(id, null);
    firstHops.set(id, null);
    unvisited.add(id);
  }

  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current: number | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      const d = distances.get(node)!;
      if (d < minDist) {
        minDist = d;
        current = node;
      }
    }

    if (current === null || minDist === Infinity) {
      break;
    }

    unvisited.delete(current);

    const neighbors = adjacency.get(current) || [];
    for (const { nodeId: neighborId, weight } of neighbors) {
      if (!unvisited.has(neighborId)) continue;

      const neighborNode = nodesMap.get(neighborId);
      let riskPenalty = 0;

      if (neighborNode && riskWeight > 0 && policeOfficers.length > 0) {
        riskPenalty = riskWeight * calculateNodeRisk(neighborNode, policeOfficers, safetyBuffer);
      }

      const totalEdgeCost = weight + riskPenalty;
      const alt = distances.get(current)! + totalEdgeCost;

      if (alt < distances.get(neighborId)!) {
        distances.set(neighborId, alt);
        previous.set(neighborId, current);

        // Track first hop from start node
        if (current === startNodeId) {
          firstHops.set(neighborId, neighborId);
        } else {
          firstHops.set(neighborId, firstHops.get(current)!);
        }
      }
    }
  }

  return { distances, previous, firstHops };
}

/**
 * Reconstructs the shortest path from startNode to targetNode
 */
export function reconstructPath(
  targetNodeId: number,
  previous: Map<number, number | null>
): number[] {
  const path: number[] = [];
  let curr: number | null = targetNodeId;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous.get(curr) ?? null;
  }
  return path;
}
