Subway Escape: The Ultimate Chase — Autonomous Bot Workshop & Arena

Official technical documentation, starter kits, mathematical models, and local testing simulator for the Subway Escape autonomous bot competition.
📋 Table of Contents

Challenge Overview

Key Rules & Priorities
Repository Structure
Quick Start
Official Wire Protocol & I/O Schema
Mathematical Formulations
Starter Bot Implementations
Code Hero Submission Specification
Pre-Submission Verification Checklist
Web Simulator Development
🎯 Challenge Overview
In Subway Escape – The Ultimate Chase, your task is to build an autonomous bot controlling a team of runners navigating an underground transit network. Your goal is to maximize total capital successfully deposited into safehouses over exactly 300 ticks.
Every tick, the tournament engine feeds the current state of the subway network (nodes, tracks, runners, money drops, and police patrols) to your bot via stdin. Your bot has under 1,000 ms to return a list of actions—one for each runner—via stdout.
The 4 Core Priorities:
💰 Collect: Snag high-value drops before exponential decay (
) or TTL expiration destroys their worth.
🧭 Navigate: Calculate optimal routes through a dynamic graph with variable edge weights and blocked tracks.
🛡️ Survive: Evade police circular hazard zones (
) and prevent capture stuns that confiscate 100% of carried inventory.
🏦 Deposit: Deliver carried loot to safehouses before risk or leakage erodes its value. Unbanked loot at Tick 300 yields 0 points.
⚖️ Key Rules & Priorities
Mechanic	Rule Specification	Penalty on Breach
Match Duration	Exactly 300 ticks (Tick 0 to 299)	Match concludes automatically after Tick 299
Response Latency	< 1,000 ms per tick (target < 50 ms)	Timeout; engine forces HOLD for all runners
Resource Limits	1 vCPU, 512 MB RAM	Out-of-memory crash (SIGKILL)
Police Stun	Distance to officer 
Runner immobilized for 5 ticks; 100% loot confiscated
Track Maintenance	Edge weight negative (e.g. -1.0)	Blocked track; traversing forces HOLD and raises warning
Standard I/O	stdout reserved strictly for minified JSON	Any debug print() to stdout breaks parser; use stderr
📂 Repository Structure
code
Code
.
├── README.md                      # Comprehensive project documentation (this file)
├── index.html                     # Web app entry point & metadata
├── package.json                   # Dependencies (React 19, Vite, Tailwind CSS, Lucide)
├── vite.config.ts                 # Build & development server configuration
├── src/
│   ├── App.tsx                    # Main multi-view application shell
│   ├── main.tsx                   # React root hydration
│   ├── index.css                  # Global Tailwind imports & typography
│   ├── types/
│   │   └── game.ts                # TypeScript interfaces for nodes, runners, drops, police, and actions
│   ├── lib/
│   │   ├── constants.ts           # Map topologies (16-node Metropolis, 20-node Downtown), constants
│   │   ├── pathfinding.ts         # Risk-weighted Dijkstra algorithm & police trajectory projection
│   │   ├── bots.ts                # SOTA autonomous strategies (Hunter-Banker, Greedy, Cautious)
│   │   └── engine.ts              # 300-tick local simulation engine & event logger
│   ├── data/
│   │   └── starterPacks.ts        # Embedded source code for Python, C++, Java, and runner script
│   └── components/
│       ├── Header.tsx             # Navigation bar with live match telemetry
│       ├── ArenaSimulator.tsx     # 2D interactive SVG subway network visualizer & controls
│       ├── DocumentationView.tsx  # Interactive technical reference & schema tables
│       ├── StarterCodeView.tsx    # Syntax-highlighted starter templates with copy/download
│       ├── RulesView.tsx          # Interactive exponential decay curve slider & physics specs
│       └── SampleIOInspector.tsx  # JSON testbed to test strategy against arbitrary state inputs
🚀 Quick Start
1. Launch the Interactive Web Workshop
Test strategies visually with live playback, step-by-step stepping, and real-time police hazard radar:
code
Bash
# Install dependencies
npm install

# Start local development server
npm run dev
Visit http://localhost:3000 to interact with the subway visualizer.
2. Run Local Python Practice Match
Run a local simulation match using standard I/O pipes:
code
Bash
# Quick dry-run sanity check
python templates/python/my_bot.py --test

# Run full 300-tick practice match
python practice_arena/run_practice.py --bot "python templates/python/my_bot.py" --seed 42 --ticks 300
📡 Official Wire Protocol & I/O Schema
Input State Schema (stdin)
Every tick, a single-line JSON string is sent by the engine:
code
JSON
{
  "tick": 42,
  "graph_nodes": [
    { "id": 0, "x": 120.0, "y": 120.0, "type": "safehouse" },
    { "id": 1, "x": 260.0, "y": 100.0, "type": "junction" },
    { "id": 2, "x": 420.0, "y": 100.0, "type": "money_spot" }
  ],
  "graph_edges": [
    { "from": 0, "to": 1, "current_weight": 2.0 },
    { "from": 1, "to": 2, "current_weight": 2.0 },
    { "from": 0, "to": 2, "current_weight": -1.0 }
  ],
  "my_runners": [
    {
      "id": 0,
      "current_node": 2,
      "x": 420.0,
      "y": 100.0,
      "carrying_loot": 45.0,
      "max_capacity": 100.0,
      "status": "ACTIVE",
      "stun_ticks_remaining": 0
    }
  ],
  "active_money_drops": [
    {
      "drop_id": 7,
      "node_id": 2,
      "target_safehouse_node": 0,
      "current_value": 78.4,
      "leak_lambda": 0.015,
      "ttl_remaining": 22
    }
  ],
  "police_officers": [
    {
      "id": 0,
      "x": 280.0,
      "y": 210.0,
      "vx": 3.2,
      "vy": 1.5,
      "radius": 45.0
    }
  ]
}
Output Actions Schema (stdout)
Respond with a JSON object containing an array of actions for all runners:
code
JSON
{
  "runner_actions": [
    { "runner_id": 0, "action": "TRAVERSE", "target_node": 1 },
    { "runner_id": 1, "action": "COLLECT" },
    { "runner_id": 2, "action": "DEPOSIT" },
    { "runner_id": 3, "action": "HOLD" }
  ]
}
Valid Action Types:
TRAVERSE: Move along an open connected track to target_node.
COLLECT: Pick up money drop on current station (up to max_capacity).
DEPOSIT: Bank all carried inventory (must currently stand on a safehouse node).
HOLD: Stay at current station.
📐 Mathematical Formulations
1. Exponential Money Drop Decay
Every drop decays continuously each tick according to:
When evaluating whether to target a drop at distance 
:

2. Police Hazard Risk Modeling
Police move with constant velocity and bounce off arena boundaries:
During Dijkstra edge relaxation, the cost of moving into node 
 is penalized:

Where 
 if 
.
💻 Starter Bot Implementations
Python (my_bot.py)
Features:
Risk-weighted Dijkstra with police circular hazard field penalty
Multi-step police trajectory prediction (
)
Dynamic utility auction (prevents runner target overlap)
Automatic safehouse deposit when capacity 
 or when 
 ticks remain
Exception isolation (try...except) to prevent forfeiture
C++20 (MyBot.cpp)
Features:
std::priority_queue Dijkstra implementation
Direct fast I/O (cin.tie(nullptr))
Execution time 
 per tick
Java 17/21 (MyBot.java)
Features:
BufferedReader and PrintWriter streaming loop
Standard object models and priority queue graph navigation
🦸 Code Hero Submission Specification
When submitting your bot code to the competition portal, your source file must include the official Code Hero Metadata Header at the very top:
code
Python
# ==============================================================================
#  CODE HERO: SUBWAY ESCAPE SUBMISSION MANIFEST
# ==============================================================================
#  Team / Bot Name    : ApexPhantom
#  Participant / Lead : Sushweta Ghosh
#  Language / Runtime : Python 3.10+
#  Strategy Model     : Multi-Agent Utility Auction + Risk-Weighted Dijkstra
#  Benchmark Banked   : $1,420+ (Practice Arena Metropolis Central)
#  Stun Rate          : 0 Stuns across 300 Ticks
#  Average Latency    : 2.1 ms / tick (SLA limit: 1000 ms)
# ==============================================================================
Submission Bundle Requirements:
Primary file: Named my_bot.py (Python), MyBot.cpp (C++), or MyBot.java (Java).
Standard Entry: Must be executable via standard command line (e.g., python my_bot.py).
No External Network: The execution container has no internet access; do not attempt outbound sockets or external API calls.
Self-Contained: Only standard library packages or dependencies specified in competition guidelines.
✅ Pre-Submission Verification Checklist
Before submitting your final code, ensure all 6 checks pass:

No standard print() calls: All debug messages must be routed to stderr (sys.stderr.write or std::cerr).

Strict JSON output: Exactly one newline-terminated JSON line emitted per tick.

Try-Except Shield: Code handles malformed inputs without crashing the process.

Blocked Track Awareness: Negative weights (
) are filtered out from pathfinding.

Endgame Rush Logic: Runners flush all inventory to safehouses before Tick 300.

Latency Compliance: Response completes in 
 on 1 vCPU.
🛠️ Web Simulator Development
This repository includes a full React + Vite + Tailwind CSS simulation suite.
code
Bash
# Development mode
npm run dev

# Typecheck and lint
npm run lint

# Production build
npm run build
📜 License & Acknowledgements
Created for the Subway Escape – The Ultimate Chase Autonomous Bot Competition. Licensed under the Apache-2.0 License.
