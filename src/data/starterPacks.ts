/**
 * Starter Code Packs, Local Practice Runner, and Wire Schemas
 * for Subway Escape: The Ultimate Chase
 */

export const PYTHON_STARTER_CODE = `"""
Subway Escape - High-Performance Autonomous Bot
===============================================
Official template with production-grade heuristic pathfinding:
- Modified Dijkstra with police proximity hazard fields
- Future trajectory prediction (x + vx*t, y + vy*t)
- Dynamic utility evaluation with exponential leak discounting: V = V_0 * e^(-lambda * dt)
- Multi-runner target assignment
- Opportunistic safehouse deposits
"""

import json
import math
import sys
import heapq
import traceback

INF = math.inf


def log(message):
    """Debug message sent to stderr so it never corrupts game protocol stdout."""
    print(message, file=sys.stderr, flush=True)


def distance(x1, y1, x2, y2):
    return math.hypot(x1 - x2, y1 - y2)


def predict_police(p, ticks_ahead):
    """Project police position after ticks_ahead steps with bounds reflection."""
    x = p["x"] + p["vx"] * ticks_ahead
    y = p["y"] + p["vy"] * ticks_ahead
    # Assume bounds 80-680 x, 80-510 y
    min_x, max_x = 80, 680
    min_y, max_y = 80, 510
    w = max_x - min_x
    h = max_y - min_y
    rel_x = (x - min_x) % (2 * w)
    rel_y = (y - min_y) % (2 * h)
    nx = max_x - (rel_x - w) if rel_x > w else min_x + rel_x
    ny = max_y - (rel_y - h) if rel_y > h else min_y + rel_y
    return nx, ny


def calculate_node_risk(node_coords, police_list, safety_buffer=25):
    """Return risk penalty if node is in or near police hazard radius."""
    nx, ny = node_coords["x"], node_coords["y"]
    max_risk = 0.0
    for p in police_list:
        # Check current and 1 tick ahead
        for t in (0, 1):
            px, py = (p["x"], p["y"]) if t == 0 else predict_police(p, 1)
            dist = distance(nx, ny, px, py)
            hazard_r = p["radius"] + safety_buffer
            if dist <= hazard_r:
                penalty = ((hazard_r - dist) / hazard_r + 1.0) * 35.0
                if penalty > max_risk:
                    max_risk = penalty
    return max_risk


def dijkstra_with_risk(start_node, neighbors, nodes, police_list, risk_weight=1.5):
    """
    Find shortest travel costs from start_node to all nodes,
    adding risk penalty for passing near police hazard circles.
    """
    distances = {n: INF for n in neighbors}
    first_hops = {n: None for n in neighbors}
    distances[start_node] = 0
    pq = [(0, start_node, None)]  # (dist, node, first_hop)

    while pq:
        d, curr, first_hop = heapq.heappop(pq)
        if d > distances[curr]:
            continue

        for neighbor, weight in neighbors[curr]:
            if weight == INF or weight < 0:
                continue
            
            # Risk at target node
            risk = 0.0
            if police_list and risk_weight > 0:
                risk = risk_weight * calculate_node_risk(nodes[neighbor], police_list)

            new_dist = d + weight + risk
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                fhop = first_hop if first_hop is not None else neighbor
                first_hops[neighbor] = fhop
                heapq.heappush(pq, (new_dist, neighbor, fhop))

    return distances, first_hops


# ===========================================================================
#  >>>  STRATEGY LOGIC  <<<
# ===========================================================================
def strategy(tick, nodes, neighbors, runners, drops, police, safehouses, money_spots):
    """
    Core Autonomous Bot Strategy:
    1. Deposit at safehouse immediately if carrying loot.
    2. Collect drop if currently standing on one.
    3. Return to safehouse if inventory >= 70% capacity or match nearing end.
    4. Compute dynamic utility of available drops (value discounted by travel decay).
    5. Flee or patrol safest node if idle.
    """
    actions = []
    claimed_drops = set()
    safehouse_set = set(safehouses)
    ticks_remaining = 300 - tick

    for runner in runners:
        rid = runner["id"]
        if runner.get("status") == "STUNNED":
            actions.append({"runner_id": rid, "action": "HOLD"})
            continue

        curr = runner["current_node"]
        loot = runner["carrying_loot"]
        cap = runner["max_capacity"]

        # RULE 1: Bank loot immediately if at safehouse
        if curr in safehouse_set and loot > 0:
            actions.append({"runner_id": rid, "action": "DEPOSIT"})
            continue

        # RULE 2: Collect if standing on valid drop
        active_here = [d for d in drops if d["node_id"] == curr and d["ttl_remaining"] > 0 and d["current_value"] > 0]
        if active_here and loot < cap:
            actions.append({"runner_id": rid, "action": "COLLECT"})
            claimed_drops.add(active_here[0]["drop_id"])
            continue

        # Run risk-weighted Dijkstra
        distances, first_hops = dijkstra_with_risk(curr, neighbors, nodes, police, risk_weight=1.5)

        # RULE 3: Deposit if capacity threshold met or late in match
        cap_ratio = (loot / cap) if cap > 0 else 0
        must_deposit = loot > 0 and (cap_ratio >= 0.70 or ticks_remaining <= 25)

        if must_deposit and safehouses:
            best_sh = min(safehouses, key=lambda s: distances.get(s, INF))
            next_step = first_hops.get(best_sh)
            if next_step is not None and next_step != curr:
                actions.append({"runner_id": rid, "action": "TRAVERSE", "target_node": next_step})
                continue

        # RULE 4: Select best drop by projected discounted utility
        best_drop = None
        best_utility = -INF

        rem_cap = cap - loot
        for drop in drops:
            did = drop["drop_id"]
            if did in claimed_drops or drop["ttl_remaining"] <= 0:
                continue

            target_node = drop["node_id"]
            dist = distances.get(target_node, INF)
            if dist == INF or dist > drop["ttl_remaining"]:
                continue

            # Decay formula: V_expected = V_0 * e^(-lambda * dist)
            decayed_val = drop["current_value"] * math.exp(-drop["leak_lambda"] * dist)
            collectible = min(decayed_val, rem_cap)
            if collectible <= 0:
                continue

            # Utility score per tick
            utility = collectible / (dist + 1.0)
            if utility > best_utility:
                best_utility = utility
                best_drop = drop

        if best_drop and best_utility > 0.4:
            claimed_drops.add(best_drop["drop_id"])
            next_step = first_hops.get(best_drop["node_id"])
            if next_step is not None and next_step != curr:
                actions.append({"runner_id": rid, "action": "TRAVERSE", "target_node": next_step})
                continue

        # RULE 5: Head to safehouse if carrying any loot
        if loot > 0 and safehouses:
            best_sh = min(safehouses, key=lambda s: distances.get(s, INF))
            next_step = first_hops.get(best_sh)
            if next_step is not None and next_step != curr:
                actions.append({"runner_id": rid, "action": "TRAVERSE", "target_node": next_step})
                continue

        # RULE 6: Patrol closest money spot or hold
        if money_spots:
            best_spot = min(money_spots, key=lambda m: distances.get(m, INF))
            next_step = first_hops.get(best_spot)
            if next_step is not None and next_step != curr:
                actions.append({"runner_id": rid, "action": "TRAVERSE", "target_node": next_step})
                continue

        actions.append({"runner_id": rid, "action": "HOLD"})

    return actions


# ===========================================================================
#  ENGINE HARNESS (Standard Boilerplate)
# ===========================================================================
VALID_ACTIONS = {"TRAVERSE", "HOLD", "COLLECT", "DEPOSIT"}

def _hold(runner_id):
    return {"runner_id": runner_id, "action": "HOLD"}

def check_actions(raw, runners, neighbors):
    if not isinstance(raw, list):
        log("WARNING: strategy must return a list.")
        raw = []
    runner_by_id = {r["id"]: r for r in runners}
    chosen = {}
    for item in raw:
        if not isinstance(item, dict) or item.get("runner_id") not in runner_by_id:
            continue
        rid = item["runner_id"]
        if rid in chosen:
            continue
        kind = item.get("action")
        if kind not in VALID_ACTIONS:
            continue
        if kind == "TRAVERSE":
            here = runner_by_id[rid]["current_node"]
            target = item.get("target_node")
            if not any(n == target and w != INF for n, w in neighbors[here]):
                continue
            chosen[rid] = {"runner_id": rid, "action": "TRAVERSE", "target_node": target}
        else:
            chosen[rid] = {"runner_id": rid, "action": kind}

    final = []
    for r in runners:
        if r.get("status") == "STUNNED":
            final.append(_hold(r["id"]))
        elif r["id"] in chosen:
            final.append(chosen[r["id"]])
        else:
            final.append(_hold(r["id"]))
    return final

def run_tick(state):
    runners = state.get("my_runners", [])
    try:
        nodes = {n["id"]: {"x": n["x"], "y": n["y"], "type": n["type"]} for n in state["graph_nodes"]}
        neighbors = {node_id: [] for node_id in nodes}
        for e in state["graph_edges"]:
            w = e["current_weight"]
            if w < 0:
                w = INF
            neighbors[e["from"]].append((e["to"], w))
            neighbors[e["to"]].append((e["from"], w))

        safehouses = [i for i, n in nodes.items() if n["type"] == "safehouse"]
        money_spots = [i for i, n in nodes.items() if n["type"] == "money_spot"]

        raw = strategy(
            state["tick"], nodes, neighbors, runners,
            state.get("active_money_drops", []),
            state.get("police_officers", []),
            safehouses, money_spots
        )
        return check_actions(raw, runners, neighbors)
    except Exception:
        log(traceback.format_exc())
        return [_hold(r["id"]) for r in runners]

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        actions = run_tick(json.loads(line))
        print(json.dumps({"runner_actions": actions}), flush=True)

if __name__ == "__main__":
    main()
`;

export const CPP_STARTER_CODE = `/**
 * Subway Escape - High-Performance C++20 Starter Bot
 * Compile: g++ -O3 -std=c++20 MyBot.cpp -o my_bot
 */

#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <unordered_map>
#include <queue>
#include <cmath>
#include <limits>
#include <algorithm>

// NOTE: Uses nlohmann/json or simple custom stream parser.
// Ensure <nlohmann/json.hpp> is in your include path if using JSON library.
#include <nlohmann/json.hpp>

using json = nlohmann::json;
using namespace std;

constexpr double INF = numeric_limits<double>::infinity();

struct Node {
    int id;
    double x, y;
    string type;
};

struct Edge {
    int to;
    double weight;
};

struct Runner {
    int id;
    int current_node;
    double carrying_loot;
    double max_capacity;
    string status;
};

struct MoneyDrop {
    int drop_id;
    int node_id;
    double current_value;
    double leak_lambda;
    int ttl_remaining;
};

struct Police {
    int id;
    double x, y, vx, vy, radius;
};

// Dijkstra shortest path with distance & first hop
void dijkstra(int start, const unordered_map<int, vector<Edge>>& adj,
              unordered_map<int, double>& dist, unordered_map<int, int>& first_hop) {
    for (const auto& [node_id, _] : adj) {
        dist[node_id] = INF;
        first_hop[node_id] = -1;
    }
    dist[start] = 0.0;

    using State = tuple<double, int, int>;
    priority_queue<State, vector<State>, greater<State>> pq;
    pq.push({0.0, start, -1});

    while (!pq.empty()) {
        auto [d, u, fhop] = pq.top();
        pq.pop();

        if (d > dist[u]) continue;

        if (adj.find(u) == adj.end()) continue;
        for (const auto& edge : adj.at(u)) {
            int v = edge.to;
            double w = edge.weight;
            if (w < 0 || w == INF) continue;

            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                int next_hop = (fhop == -1) ? v : fhop;
                first_hop[v] = next_hop;
                pq.push({dist[v], v, next_hop});
            }
        }
    }
}

json strategy(int tick, const unordered_map<int, Node>& nodes,
              const unordered_map<int, vector<Edge>>& adj,
              const vector<Runner>& runners,
              const vector<MoneyDrop>& drops,
              const vector<Police>& police,
              const vector<int>& safehouses) {
    
    json actions = json::array();

    for (const auto& r : runners) {
        if (r.status == "STUNNED") {
            actions.push_back({{"runner_id", r.id}, {"action", "HOLD"}});
            continue;
        }

        // 1. DEPOSIT if at safehouse
        bool is_safehouse = false;
        for (int sh : safehouses) {
            if (sh == r.current_node) { is_safehouse = true; break; }
        }
        if (is_safehouse && r.carrying_loot > 0) {
            actions.push_back({{"runner_id", r.id}, {"action", "DEPOSIT"}});
            continue;
        }

        // 2. COLLECT if drop on current node
        bool collected = false;
        for (const auto& d : drops) {
            if (d.node_id == r.current_node && d.ttl_remaining > 0 && r.carrying_loot < r.max_capacity) {
                actions.push_back({{"runner_id", r.id}, {"action", "COLLECT"}});
                collected = true;
                break;
            }
        }
        if (collected) continue;

        // 3. Shortest Path Navigation
        unordered_map<int, double> dist;
        unordered_map<int, int> first_hop;
        dijkstra(r.current_node, adj, dist, first_hop);

        // If carrying >= 70% capacity, route to nearest safehouse
        if (r.carrying_loot >= r.max_capacity * 0.70 && !safehouses.empty()) {
            int best_sh = -1;
            double min_d = INF;
            for (int sh : safehouses) {
                if (dist[sh] < min_d) { min_d = dist[sh]; best_sh = sh; }
            }
            if (best_sh != -1 && first_hop[best_sh] != -1) {
                actions.push_back({{"runner_id", r.id}, {"action", "TRAVERSE"}, {"target_node", first_hop[best_sh]}});
                continue;
            }
        }

        // Chase nearest drop
        int best_target = -1;
        double min_drop_dist = INF;
        for (const auto& d : drops) {
            if (d.ttl_remaining > 0 && dist[d.node_id] < min_drop_dist) {
                min_drop_dist = dist[d.node_id];
                best_target = d.node_id;
            }
        }

        if (best_target != -1 && first_hop[best_target] != -1) {
            actions.push_back({{"runner_id", r.id}, {"action", "TRAVERSE"}, {"target_node", first_hop[best_target]}});
            continue;
        }

        actions.push_back({{"runner_id", r.id}, {"action", "HOLD"}});
    }

    return actions;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    string line;
    while (getline(cin, line)) {
        if (line.empty()) continue;
        try {
            json state = json::parse(line);
            int tick = state["tick"];

            unordered_map<int, Node> nodes;
            unordered_map<int, vector<Edge>> adj;
            vector<int> safehouses;

            for (const auto& n : state["graph_nodes"]) {
                int id = n["id"];
                nodes[id] = {id, n["x"], n["y"], n["type"]};
                adj[id] = {};
                if (n["type"] == "safehouse") safehouses.push_back(id);
            }

            for (const auto& e : state["graph_edges"]) {
                double w = e["current_weight"];
                if (w < 0) w = INF;
                adj[e["from"]].push_back({e["to"], w});
                adj[e["to"]].push_back({e["from"], w});
            }

            vector<Runner> runners;
            for (const auto& r : state["my_runners"]) {
                runners.push_back({r["id"], r["current_node"], r["carrying_loot"], r["max_capacity"], r["status"]});
            }

            vector<MoneyDrop> drops;
            for (const auto& d : state["active_money_drops"]) {
                drops.push_back({d["drop_id"], d["node_id"], d["current_value"], d["leak_lambda"], d["ttl_remaining"]});
            }

            vector<Police> police;
            for (const auto& p : state["police_officers"]) {
                police.push_back({p["id"], p["x"], p["y"], p["vx"], p["vy"], p["radius"]});
            }

            json acts = strategy(tick, nodes, adj, runners, drops, police, safehouses);
            json out = {{"runner_actions", acts}};
            cout << out.dump() << "\\n" << flush;
        } catch (const exception& e) {
            cerr << "Exception in tick processing: " << e.what() << endl;
        }
    }
    return 0;
}
`;

export const JAVA_STARTER_CODE = `/**
 * Subway Escape - Java 17/21 Starter Bot
 * Compile: javac MyBot.java
 * Run: java MyBot
 */

import java.io.*;
import java.util.*;

public class MyBot {

    static class Node {
        int id;
        double x, y;
        String type;
        Node(int id, double x, double y, String type) {
            this.id = id; this.x = x; this.y = y; this.type = type;
        }
    }

    static class Edge {
        int to;
        double weight;
        Edge(int to, double weight) { this.to = to; this.weight = weight; }
    }

    static class Runner {
        int id;
        int currentNode;
        double carryingLoot;
        double maxCapacity;
        String status;
    }

    static class MoneyDrop {
        int dropId;
        int nodeId;
        double currentValue;
        double leakLambda;
        int ttlRemaining;
    }

    // Dijkstra algorithm
    static void dijkstra(int start, Map<Integer, List<Edge>> adj,
                         Map<Integer, Double> dist, Map<Integer, Integer> firstHop) {
        for (int u : adj.keySet()) {
            dist.put(u, Double.POSITIVE_INFINITY);
            firstHop.put(u, -1);
        }
        dist.put(start, 0.0);

        PriorityQueue<double[]> pq = new PriorityQueue<>(Comparator.comparingDouble(a -> a[0]));
        pq.offer(new double[]{0.0, start, -1});

        while (!pq.isEmpty()) {
            double[] top = pq.poll();
            double d = top[0];
            int u = (int) top[1];
            int fhop = (int) top[2];

            if (d > dist.get(u)) continue;

            List<Edge> edges = adj.getOrDefault(u, Collections.emptyList());
            for (Edge e : edges) {
                if (e.weight < 0 || Double.isInfinite(e.weight)) continue;
                double newDist = d + e.weight;
                if (newDist < dist.get(e.to)) {
                    dist.put(e.to, newDist);
                    int nextHop = (fhop == -1) ? e.to : fhop;
                    firstHop.put(e.to, nextHop);
                    pq.offer(new double[]{newDist, e.to, nextHop});
                }
            }
        }
    }

    public static void main(String[] args) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        PrintWriter writer = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));

        String line;
        while ((line = reader.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) continue;

            try {
                // Parse state JSON using your chosen JSON library (Jackson/Gson or simple manual)
                // Output runner_actions: [{"runner_id":0, "action":"DEPOSIT"}]
                StringBuilder sb = new StringBuilder();
                sb.append("{\\"runner_actions\\":[");
                // Example action
                sb.append("{\\"runner_id\\":0,\\"action\\":\\"HOLD\\"}");
                sb.append("]}");

                writer.println(sb.toString());
                writer.flush();
            } catch (Exception e) {
                System.err.println("Tick error: " + e.getMessage());
            }
        }
    }
}
`;

export const LOCAL_PRACTICE_RUNNER = `#!/usr/bin/env python3
"""
Subway Escape - Local Practice Arena Runner (run_practice.py)
============================================================
Launches a standalone 300-tick simulation match against your bot
via standard I/O (stdin/stdout pipe).

Usage:
    python practice_arena/run_practice.py --bot "python templates/python/my_bot.py"
    python practice_arena/run_practice.py --bot "./my_cpp_bot" --ticks 300 --seed 42
"""

import argparse
import json
import math
import subprocess
import sys
import time

def generate_arena(seed=42):
    """Generate reproducible 16-node subway arena."""
    nodes = [
        {"id": 0, "x": 120.0, "y": 120.0, "type": "safehouse"},
        {"id": 1, "x": 260.0, "y": 100.0, "type": "junction"},
        {"id": 2, "x": 420.0, "y": 100.0, "type": "money_spot"},
        {"id": 3, "x": 560.0, "y": 120.0, "type": "safehouse"},
        {"id": 4, "x": 140.0, "y": 240.0, "type": "money_spot"},
        {"id": 5, "x": 280.0, "y": 220.0, "type": "junction"},
        {"id": 6, "x": 400.0, "y": 220.0, "type": "money_spot"},
        {"id": 7, "x": 540.0, "y": 240.0, "type": "junction"},
        {"id": 8, "x": 140.0, "y": 360.0, "type": "junction"},
        {"id": 9, "x": 260.0, "y": 380.0, "type": "money_spot"},
        {"id": 10, "x": 420.0, "y": 380.0, "type": "junction"},
        {"id": 11, "x": 540.0, "y": 360.0, "type": "money_spot"},
        {"id": 12, "x": 200.0, "y": 480.0, "type": "safehouse"},
        {"id": 13, "x": 340.0, "y": 480.0, "type": "money_spot"},
        {"id": 14, "x": 480.0, "y": 480.0, "type": "safehouse"},
        {"id": 15, "x": 340.0, "y": 150.0, "type": "junction"},
    ]
    edges = [
        {"from": 0, "to": 1, "current_weight": 2.0},
        {"from": 1, "to": 2, "current_weight": 2.0},
        {"from": 2, "to": 3, "current_weight": 2.0},
        {"from": 0, "to": 4, "current_weight": 2.0},
        {"from": 1, "to": 15, "current_weight": 1.0},
        {"from": 15, "to": 2, "current_weight": 1.0},
        {"from": 15, "to": 5, "current_weight": 2.0},
        {"from": 4, "to": 5, "current_weight": 2.0},
        {"from": 5, "to": 6, "current_weight": 2.0},
        {"from": 6, "to": 7, "current_weight": 2.0},
        {"from": 3, "to": 7, "current_weight": 2.0},
        {"from": 4, "to": 8, "current_weight": 2.0},
        {"from": 5, "to": 9, "current_weight": 2.0},
        {"from": 6, "to": 10, "current_weight": 2.0},
        {"from": 7, "to": 11, "current_weight": 2.0},
        {"from": 8, "to": 9, "current_weight": 2.0},
        {"from": 9, "to": 10, "current_weight": 2.0},
        {"from": 10, "to": 11, "current_weight": 2.0},
        {"from": 8, "to": 12, "current_weight": 2.0},
        {"from": 9, "to": 13, "current_weight": 2.0},
        {"from": 10, "to": 14, "current_weight": 2.0},
        {"from": 12, "to": 13, "current_weight": 2.0},
        {"from": 13, "to": 14, "current_weight": 2.0},
    ]
    return nodes, edges

def main():
    parser = argparse.ArgumentParser(description="Subway Escape Local Practice Arena")
    parser.add_argument("--bot", required=True, help="Command to run bot (e.g. 'python my_bot.py')")
    parser.add_argument("--ticks", type=int, default=300, help="Total ticks (default: 300)")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed")
    args = parser.parse_args()

    print(f"=== SUBWAY ESCAPE PRACTICE ARENA ===")
    print(f"Starting bot process: {args.bot}")
    proc = subprocess.Popen(
        args.bot, shell=True,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr,
        text=True, bufsize=1
    )

    nodes, edges = generate_arena(args.seed)
    runners = [
        {"id": 0, "current_node": 0, "x": 120.0, "y": 120.0, "carrying_loot": 0.0,
         "max_capacity": 100.0, "status": "ACTIVE", "stun_ticks_remaining": 0},
        {"id": 1, "current_node": 3, "x": 560.0, "y": 120.0, "carrying_loot": 0.0,
         "max_capacity": 100.0, "status": "ACTIVE", "stun_ticks_remaining": 0},
    ]
    drops = [
        {"drop_id": 1, "node_id": 2, "target_safehouse_node": 0,
         "initial_value": 75.0, "current_value": 75.0, "leak_lambda": 0.015, "ttl_remaining": 40, "spawn_tick": 0},
        {"drop_id": 2, "node_id": 6, "target_safehouse_node": 3,
         "initial_value": 60.0, "current_value": 60.0, "leak_lambda": 0.02, "ttl_remaining": 35, "spawn_tick": 0},
    ]
    police = [
        {"id": 0, "x": 280.0, "y": 220.0, "vx": 3.0, "vy": 1.5, "radius": 45.0},
        {"id": 1, "x": 420.0, "y": 380.0, "vx": -2.5, "vy": -2.0, "radius": 45.0},
    ]

    total_banked = 0.0
    stuns = 0

    try:
        for tick in range(args.ticks):
            # Send state payload
            state_payload = {
                "tick": tick,
                "graph_nodes": nodes,
                "graph_edges": edges,
                "my_runners": runners,
                "active_money_drops": drops,
                "police_officers": police,
            }
            proc.stdin.write(json.dumps(state_payload) + "\\n")
            proc.stdin.flush()

            # Read action response
            t0 = time.perf_counter()
            response_line = proc.stdout.readline()
            latency_ms = (time.perf_counter() - t0) * 1000

            if not response_line:
                print(f"[Tick {tick}] Bot terminated unexpectedly!")
                break

            response = json.loads(response_line)
            actions = response.get("runner_actions", [])

            if latency_ms > 1000:
                print(f"WARNING: [Tick {tick}] Bot exceeded 1000ms latency ({latency_ms:.1f}ms)!")

            # Simulate simple movements & deposits
            for act in actions:
                rid = act.get("runner_id")
                runner = next((r for r in runners if r["id"] == rid), None)
                if not runner or runner["status"] == "STUNNED":
                    continue
                action_kind = act.get("action")
                if action_kind == "DEPOSIT":
                    if runner["current_node"] in [0, 3, 12, 14] and runner["carrying_loot"] > 0:
                        total_banked += runner["carrying_loot"]
                        runner["carrying_loot"] = 0.0
                elif action_kind == "COLLECT":
                    drop = next((d for d in drops if d["node_id"] == runner["current_node"]), None)
                    if drop and runner["carrying_loot"] < runner["max_capacity"]:
                        amt = min(drop["current_value"], runner["max_capacity"] - runner["carrying_loot"])
                        runner["carrying_loot"] += amt
                        drops.remove(drop)
                elif action_kind == "TRAVERSE":
                    runner["current_node"] = act["target_node"]
                    tn = next(n for n in nodes if n["id"] == act["target_node"])
                    runner["x"], runner["y"] = tn["x"], tn["y"]

            if tick % 50 == 0 or tick == args.ticks - 1:
                print(f"[Tick {tick:03d}/{args.ticks}] Banked: \${total_banked:7.2f} | Latency: {latency_ms:.1f}ms")

        print("=" * 45)
        print(f"MATCH COMPLETE!")
        print(f"Total Capital Banked: \${total_banked:.2f}")
        print(f"Total Stuns: {stuns}")
        print("=" * 45)

    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
`;

export const SAMPLE_INPUT_JSON = {
  tick: 42,
  graph_nodes: [
    { id: 0, x: 120.0, y: 120.0, type: "safehouse" },
    { id: 1, x: 260.0, y: 100.0, type: "junction" },
    { id: 2, x: 420.0, y: 100.0, type: "money_spot" },
    { id: 3, x: 560.0, y: 120.0, type: "safehouse" },
    { id: 4, x: 140.0, y: 240.0, type: "money_spot" },
    { id: 5, x: 280.0, y: 220.0, type: "junction" }
  ],
  graph_edges: [
    { from: 0, to: 1, current_weight: 2.0 },
    { from: 1, to: 2, current_weight: 2.0 },
    { from: 2, to: 3, current_weight: 2.0 },
    { from: 0, to: 4, current_weight: 2.0 },
    { from: 4, to: 5, current_weight: -1.0 }
  ],
  my_runners: [
    {
      id: 0,
      current_node: 2,
      x: 420.0,
      y: 100.0,
      carrying_loot: 65.4,
      max_capacity: 100.0,
      status: "ACTIVE",
      stun_ticks_remaining: 0
    },
    {
      id: 1,
      current_node: 0,
      x: 120.0,
      y: 120.0,
      carrying_loot: 0.0,
      max_capacity: 100.0,
      status: "ACTIVE",
      stun_ticks_remaining: 0
    }
  ],
  active_money_drops: [
    {
      drop_id: 14,
      node_id: 2,
      target_safehouse_node: 3,
      current_value: 48.72,
      leak_lambda: 0.015,
      ttl_remaining: 18
    }
  ],
  police_officers: [
    {
      id: 0,
      x: 310.0,
      y: 195.0,
      vx: 2.5,
      vy: -1.2,
      radius: 45.0
    }
  ]
};

export const SAMPLE_OUTPUT_JSON = {
  runner_actions: [
    {
      runner_id: 0,
      action: "TRAVERSE",
      target_node: 3
    },
    {
      runner_id: 1,
      action: "TRAVERSE",
      target_node: 1
    }
  ]
};
