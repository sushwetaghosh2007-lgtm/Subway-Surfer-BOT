/**
 * Subway Escape: The Ultimate Chase - Game Types and Wire Protocol Definitions
 */

export type NodeType = 'junction' | 'money_spot' | 'safehouse';

export interface GraphNode {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  label?: string;
}

export interface GraphEdge {
  from: number;
  to: number;
  current_weight: number; // Positive float, or -1 (INF) when blocked
}

export type RunnerStatus = 'ACTIVE' | 'STUNNED';

export interface Runner {
  id: number;
  current_node: number;
  x: number;
  y: number;
  carrying_loot: number;
  max_capacity: number;
  status: RunnerStatus;
  stun_ticks_remaining: number;
  // Transit state when moving along a multi-weight edge
  transit_target_node?: number | null;
  transit_ticks_remaining?: number;
}

export interface MoneyDrop {
  drop_id: number;
  node_id: number;
  target_safehouse_node: number;
  initial_value: number;
  current_value: number;
  leak_lambda: number;
  ttl_remaining: number;
  spawn_tick: number;
}

export interface PoliceOfficer {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export type ActionType = 'TRAVERSE' | 'COLLECT' | 'DEPOSIT' | 'HOLD';

export interface RunnerAction {
  runner_id: number;
  action: ActionType;
  target_node?: number;
}

export interface GameStatePayload {
  tick: number;
  graph_nodes: GraphNode[];
  graph_edges: GraphEdge[];
  my_runners: Runner[];
  active_money_drops: MoneyDrop[];
  police_officers: PoliceOfficer[];
}

export interface TickEventLog {
  id: string;
  tick: number;
  type: 'COLLECT' | 'DEPOSIT' | 'STUN' | 'SPAWN' | 'EXPIRE' | 'BLOCKED_EDGE' | 'INFO';
  runner_id?: number;
  node_id?: number;
  amount?: number;
  message: string;
}

export interface MatchTelemetry {
  tick: number;
  total_banked: number;
  total_carrying: number;
  total_lost_stuns: number;
  total_lost_decay_or_expiry: number;
  stuns_count: number;
  collections_count: number;
  deposits_count: number;
  avg_tick_latency_ms: number;
}

export interface StrategyConfig {
  name: string;
  id: string;
  description: string;
  riskAvoidanceWeight: number; // alpha multiplier for police proximity penalty
  depositCapacityThreshold: number; // percentage of max_capacity (0-100) before prioritizing safehouse
  policeSafetyBuffer: number; // extra radius padding to treat as hazard
  futureTrajectoryLookahead: number; // ticks ahead to predict police movement
}
