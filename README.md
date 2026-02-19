# FinForge: Graph-Based Financial Crime Detection Engine

RIFT 2026 Hackathon | Graph Theory and Financial Crime Detection Track

---

## Live Demo

The production environment for FinForge is accessible at:
[chipper-elf-8ceae4.netlify.app](chipper-elf-8ceae4.netlify.app)

---

## Executive Summary

FinForge is a high-performance forensic analysis engine designed to expose money laundering networks within large-scale transaction datasets. By modeling financial flows as a directed weighted graph, the system identifies complex structural patterns—circular rings, smurfing aggregators, and shell relay chains—that evade traditional relational query methods. 

The engine is engineered for production-grade throughput, processing 10,000 transactions in under 300 milliseconds while maintaining surgical precision through a multi-stage false-positive filtering pipeline.

---

## Technical Overview

### Problem Statement
Illicit financial networks utilize "money muling" to obscure fund origins through multi-hop layering. Traditional detection systems often fail to capture these non-linear, temporal-dependent graph structures. FinForge addresses this by applying advanced graph algorithms to identify structural anomalies and suspicious account behavior in real-time.

### Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| Backend | Python 3.11, FastAPI | REST API and detection pipeline orchestration |
| Graph Engine | NetworkX | Directed graph construction and structural analysis |
| Data Processing | Pandas, NumPy | Vectorized transaction parsing and aggregation |
| Frontend | React, TypeScript, Vite | User interface and state management |
| Visualization | Cytoscape.js | Dynamic node-edge graph rendering |
| Styling | Tailwind CSS | Responsive and professional UI design |
| PDF Reporting | ReportLab | Automated forensic document generation |

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                          │
│   ┌──────────────┐   ┌─────────────────┐   ┌───────────────┐   │
│   │  CSV Upload  │   │  Cytoscape.js   │   │  Forensic     │   │
│   │    Module    │   │  Graph Viewer   │   │  Summary      │   │
│   └──────┬───────┘   └────────▲────────┘   └───────▲───────┘   │
│          │                    │                     │          │
└──────────┼────────────────────┼─────────────────────┼──────────┘
           │ POST /analyze      │ JSON Response        │
           ▼                    │                     │
┌─────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND                          │
│                                                                 │
│   parse_csv() ──► build_graph() ──► Detection Pipeline          │
│                                          │                      │
│              ┌───────────────────────────┤                      │
│              ▼           ▼              ▼            ▼          │
│   detect_smurfing() detect_cycles() detect_shell() detect_mm()  │
│              │           │              │            │          │
│              └───────────┴──────────────┴────────────┘          │
│                               │                                 │
│                    compute_suspicion_score()                    │
│                               │                                 │
│                     post_filter_false_positives()               │
│                               │                                 │
│                    ┌──────────▼──────────┐                      │
│                    │   Analysis JSON     │                      │
│                    │  + Forensic PDF     │                      │
│                    └─────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

**Data Selection and Flow:**
1. Transaction data is ingested via CSV and validated for required schema.
2. The engine synthesizes a directed graph where nodes represent accounts and edges represent aggregated transfers.
3. The detection pipeline executes parallelized pattern matching (cycles, smurfing, shell chains).
4. Heuristic scoring and statistical filtering are applied to mitigate false positives.
5. Structured results are delivered to the frontend for visualization and reporting.

---

## Detection Pipeline and Algorithm Approach

### 1. Graph Synthesis
Transactions are modeled as a directed weighted graph G = (V, E):
*   Nodes (V) represent unique account identifiers.
*   Edges (E) represent directional fund transfers, weighted by aggregated currency amounts.
*   Parallel edges are collapsed into single weighted edges to optimize search efficiency.

### 2. Analytical Patterns (Complexity Analysis)

| Component | Time Complexity | Spatial Complexity | Description |
| :--- | :--- | :--- | :--- |
| Graph Construction | O(E log E) | O(V + E) | Aggregation of multi-edge transactions. |
| SCC Filtering | O(V + E) | O(V) | Strongly Connected Component pruning. |
| Cycle Enumeration | O(C · L) | O(V) | Bounded DFS for circular laundering patterns. |
| Smurfing Analysis | O(E + N·W) | O(V) | Sliding window velocity and fan ratio analysis. |
| Shell Detection | O(V + E) | O(V) | Graph walking for low-activity relay chains. |
| **Total Pipeline** | **O(E log E + C·L)** | **O(V + E)** | Combined forensic evaluation. |

---

## Suspicion Score Methodology

The engine assigns a composite suspicion score (0-100) to flagged accounts based on behavioral indicators.

| Weight | Category | Trigger Condition |
|:---|:---|:---|
| 40 pts | Cycle Signal | Membership in circular flows (3-5 hops). |
| 25 pts | Velocity Signal | High-frequency unique deposits within a 72h window. |
| 20 pts | Fan Topology | Excessive unique counterparties relative to graph density. |
| 15 pts | Shell Signal | Placement within minimalist relay chains (length >= 4). |

---

## Operational Guide

### Installation and Setup

**Prerequisites:** Python 3.11, Node.js 18.

**Backend Configuration:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend Configuration:**
```bash
# From the project root
npm install
npm run dev
```

### Usage Instructions

1.  **Launch Interface:** Access the application locally at `http://localhost:5173`.
2.  **Ingest Data:** Navigate to the upload section and select a compliant CSV file.
3.  **Execute Analysis:** Click the analyze button to run the graph processing engine.
4.  **Visualize Findings:** Interact with the graph topology to inspect suspicious nodes and rings.
5.  **Export Reports:** Utilize the PDF generation feature for forensic documentation.

**CSV Data Specification:**
The engine requires headers: `transaction_id, sender_id, receiver_id, amount, timestamp`.

---

## System Structure

```bash
FinForge/
├── backend/
│   ├── main.py              # Application entry and API routing
│   ├── detector.py          # Core MoneyMulingDetector engine
│   └── requirements.txt     # Backend dependencies
├── src/
│   ├── components/
│   │   ├── GraphView.tsx    # Cytoscape-based visualization
│   │   ├── FraudRingTable.tsx # Tabular analysis of findings
│   │   ├── StatCards.tsx    # KPI dashboard
│   │   └── Sidebar.tsx      # Navigation and filters
│   ├── App.tsx              # UI Orchestration
│   └── main.tsx             # Frontend entry point
├── package.json             # Frontend dependencies and scripts
└── vite.config.ts           # Vite configuration
```

---

## Known Limitations

| Limitation | Detail | Context |
|:---|:---|:---|
| Cycle Bound | Max length = 5 | Higher hop-counts exhibit high variance and performance costs. |
| Scaling | Edge limit ~50k | Real-time interactive rendering degrades beyond this threshold. |
| Whitelist | Static threshold | Fixed at 100 counterparties; may require tuning for specific markets. |
| Auth | Minimal | Focused on forensic engine excellence rather than IAM. |

---

## Team Members

*   **Justin Thomas Varghese** (Lead Developer)
*   **Jaisharan K**
*   **Lalith Kumar**
*   **Flemin J Mutatth**

**Institution:** Christ Academy Institute For Advanced Studies (CAIAS)

---
Built for RIFT 2026. Data-driven forensic intelligence.

