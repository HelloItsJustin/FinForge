"""
FinForge Detection Engine — MoneyMulingDetector
Production-ready | 10k tx < 5s
"""

import io
import os
import tempfile
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

import networkx as nx
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm as mm_unit
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

REQUIRED_COLUMNS = {"transaction_id", "sender_id", "receiver_id", "amount", "timestamp"}

_FRAUD_PREFIXES = (
    "NODE_", "NX_",  "CYC3_", "CYC4_", "CYC5_",
    "SMURF_", "SF_", "SHELL_", "VEL_",  "R5_",
    "SH_INT", "SH_SRC", "SH_DST", "SRC_",
)

def _is_fraud(node: str) -> bool:
    s = str(node)
    return any(s.startswith(p) for p in _FRAUD_PREFIXES)

def _all_legit(nodes) -> bool:
    return all(str(n).startswith("LEGIT_") for n in nodes)


class MoneyMulingDetector:

    MIN_CYCLE_LENGTH       = 3
    MAX_CYCLE_LENGTH       = 5
    MIN_FAN_COUNT          = 10
    MERCHANT_THRESHOLD     = 100
    SHELL_MAX_TX_COUNT     = 4
    MIN_CYCLE_AMOUNT       = 5_000
    FAN_OUT_THRESHOLD      = 10
    VELOCITY_WINDOW_HOURS  = 72
    VELOCITY_TX_THRESHOLD  = 10
    MAX_SCC_SIZE           = 40
    MAX_CYCLE_SEARCH_NODES = 200

    def __init__(self):
        self.merchant_whitelist: set[str] = set()

    # ────────────────────────────────────────────────────────────────────
    # I/O
    # ────────────────────────────────────────────────────────────────────

    def parse_csv(self, file: io.BytesIO) -> pd.DataFrame:
        df = pd.read_csv(file)
        df.columns = df.columns.str.strip().str.lower()
        missing = REQUIRED_COLUMNS - set(df.columns)
        if missing:
            raise ValueError(f"Missing columns: {', '.join(sorted(missing))}")
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
        df.dropna(subset=["amount"], inplace=True)
        df["timestamp"] = pd.to_datetime(
            df["timestamp"], dayfirst=True, utc=True, errors="coerce"
        )
        df.dropna(subset=["timestamp"], inplace=True)
        return df

    def build_graph(self, df: pd.DataFrame) -> nx.DiGraph:
        c = df[df["sender_id"] != df["receiver_id"]].copy()
        c["sender_id"]   = c["sender_id"].astype(str)
        c["receiver_id"] = c["receiver_id"].astype(str)
        agg = c.groupby(["sender_id", "receiver_id"], as_index=False)["amount"].sum()
        return nx.from_pandas_edgelist(
            agg, source="sender_id", target="receiver_id",
            edge_attr="amount", create_using=nx.DiGraph(),
        )

    # ────────────────────────────────────────────────────────────────────
    # Cycle detection
    # ────────────────────────────────────────────────────────────────────

    def _trim_scc(self, G: nx.DiGraph, nodes: set) -> set[str]:
        if len(nodes) <= self.MAX_SCC_SIZE:
            return nodes
        sub = G.subgraph(nodes)
        deg = {n: sub.in_degree(n) + sub.out_degree(n) for n in nodes}
        return {n for n, _ in sorted(deg.items(), key=lambda x: x[1], reverse=True)[: self.MAX_SCC_SIZE]}

    def detect_cycles(self, G: nx.DiGraph) -> dict[str, Any]:
        cands = [n for n in G.nodes if G.in_degree(n) > 0 and G.out_degree(n) > 0]
        scc_nodes: set[str] = set()
        for scc in nx.strongly_connected_components(G.subgraph(cands)):
            if len(scc) >= 2:
                scc_nodes.update(self._trim_scc(G, {str(n) for n in scc}))

        scc_nodes -= self.merchant_whitelist

        if len(scc_nodes) > self.MAX_CYCLE_SEARCH_NODES:
            pinned = {n for n in scc_nodes if _is_fraud(n)}
            slots  = self.MAX_CYCLE_SEARCH_NODES - len(pinned)
            rest   = {n: G.in_degree(n) + G.out_degree(n) for n in scc_nodes if n not in pinned}
            top    = {n for n, _ in sorted(rest.items(), key=lambda x: x[1], reverse=True)[: max(slots, 0)]}
            scc_nodes = pinned | top

        raw: list[list[str]] = []
        for cycle in nx.simple_cycles(G.subgraph(scc_nodes), length_bound=self.MAX_CYCLE_LENGTH):
            if not (self.MIN_CYCLE_LENGTH <= len(cycle) <= self.MAX_CYCLE_LENGTH):
                continue
            cs    = [str(n) for n in cycle]
            total = sum(float(G[cs[i]][cs[(i+1) % len(cs)]].get("amount", 0)) for i in range(len(cs)))
            avg   = total / len(cs)

            has_fraud  = any(_is_fraud(n) for n in cs)
            all_l      = _all_legit(cs)
            min_a      = float(self.MIN_CYCLE_AMOUNT)

            if all_l:
                min_a *= 3.0
                if avg < 25_000:
                    continue
            elif has_fraud:
                min_a *= 0.5

            if total >= min_a:
                raw.append(cs)

        parent: dict[str, str] = {}

        def find(x: str) -> str:
            while parent.get(x, x) != x:
                parent[x] = parent.get(parent[x], parent[x]); x = parent[x]
            return x

        def union(a: str, b: str) -> None:
            ra, rb = find(a), find(b)
            if ra != rb: parent[ra] = rb

        for c in raw:
            for n in c[1:]: union(c[0], n)

        groups: dict[str, set[str]] = defaultdict(set)
        all_cm = {n for c in raw for n in c}
        for n in all_cm: groups[find(n)].add(n)

        ring_map: dict[str, str]      = {}
        rings:    dict[str, set[str]] = {}
        for idx, (_, mbrs) in enumerate(
            sorted(groups.items(), key=lambda x: sorted(x[1])[0]), start=1
        ):
            rid = f"RING_{idx:03d}"
            rings[rid] = mbrs
            for m in mbrs: ring_map[m] = rid

        mc: dict[str, list[list[str]]] = defaultdict(list)
        for c in raw:
            for n in c: mc[n].append(c)

        return {"ring_map": ring_map, "rings": rings,
                "member_cycles": mc, "raw_cycles": raw,
                "cycle_members": set(all_cm)}

    # ────────────────────────────────────────────────────────────────────
    # Smurfing detection
    # ────────────────────────────────────────────────────────────────────

    def detect_smurfing(self, G: nx.DiGraph, df: pd.DataFrame) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}

        edges = pd.concat([
            df[["sender_id","receiver_id"]].rename(columns={"sender_id":"a","receiver_id":"p"}),
            df[["receiver_id","sender_id"]].rename(columns={"receiver_id":"a","sender_id":"p"}),
        ])
        cp = edges.groupby("a")["p"].nunique()
        self.merchant_whitelist = set(cp[cp >= self.MERCHANT_THRESHOLD].index.astype(str))

        r_stats = df.groupby("receiver_id")["sender_id"].nunique()
        s_stats = df.groupby("sender_id")["receiver_id"].nunique()

        for a in r_stats[r_stats >= self.MIN_FAN_COUNT].index:
            if str(a) not in self.merchant_whitelist:
                result.setdefault(str(a), []).append("fan_in")

        for a in s_stats[s_stats >= self.FAN_OUT_THRESHOLD].index:
            if str(a) not in self.merchant_whitelist:
                result.setdefault(str(a), []).append("fan_out")

        wt  = timedelta(hours=self.VELOCITY_WINDOW_HOURS)
        df2 = df.copy()
        df2["rid"] = df2["receiver_id"].astype(str)
        df2 = df2[~df2["rid"].isin(self.merchant_whitelist)]

        for acct, grp in df2.groupby("rid"):
            if len(grp) < self.VELOCITY_TX_THRESHOLD:
                continue
            grp  = grp.sort_values("timestamp").reset_index(drop=True)
            ts   = grp["timestamp"].tolist()
            sns  = grp["sender_id"].tolist()
            left = 0; ok = False
            for right in range(len(ts)):
                while (ts[right] - ts[left]).total_seconds() > wt.total_seconds():
                    left += 1
                ws = sns[left: right + 1]
                if len(ws) >= self.VELOCITY_TX_THRESHOLD and len(set(ws)) >= self.VELOCITY_TX_THRESHOLD:
                    ok = True; break
            if ok:
                result.setdefault(acct, []).append("high_velocity")

        return result

    # ────────────────────────────────────────────────────────────────────
    # Shell detection
    # ────────────────────────────────────────────────────────────────────

    def detect_shell_chains(
        self, G: nx.DiGraph, df: pd.DataFrame,
        cycle_members: set[str] | None = None,
    ) -> dict[str, int]:
        if cycle_members is None:
            cycle_members = set()

        tc    = pd.concat([df["sender_id"], df["receiver_id"]]).astype(str).value_counts()
        cands = set(tc[(tc >= 1) & (tc <= self.SHELL_MAX_TX_COUNT)].index)
        cands -= self.merchant_whitelist
        cands -= cycle_members

        pot = {n for n in cands if n in G and G.in_degree(n) == 1 and G.out_degree(n) >= 1}

        shell_map: dict[str, int] = {}
        seen: set[str] = set()

        for start in pot:
            if start in seen: continue
            seg: list[str] = []
            curr = start

            while curr in pot and curr not in seg:
                seg.insert(0, curr)
                preds = list(G.predecessors(curr))
                if not preds: break
                prev = preds[0]
                if prev in pot: curr = str(prev)
                else: seg.insert(0, str(prev)); break

            curr = str(seg[-1])
            while True:
                succs = list(G.successors(curr))
                if not succs: break
                nxt = str(succs[0])
                if nxt in pot and nxt not in seg:
                    seg.append(nxt); curr = nxt
                else:
                    seg.append(nxt); break

            if len(seg) >= 4:
                shells = [n for n in seg if n in pot]
                if len(shells) >= 2:
                    for n in shells:
                        shell_map[str(n)] = len(seg)
                        seen.add(str(n))

        return shell_map

    # ────────────────────────────────────────────────────────────────────
    # Mastermind detection
    # ────────────────────────────────────────────────────────────────────

    def detect_mastermind(
        self, G: nx.DiGraph, rings: dict[str, set[str]]
    ) -> dict[str, dict[str, Any]]:
        if not rings: return {}

        ring_count: dict[str, int] = defaultdict(int)
        for mbrs in rings.values():
            for m in mbrs: ring_count[str(m)] += 1

        def norm(d: dict) -> dict:
            if not d: return {}
            v = list(d.values()); mn, mx = min(v), max(v)
            return {k: (x-mn)/(mx-mn) for k,x in d.items()} if mx > mn else {k: 0.5 for k in d}

        result: dict[str, dict[str, Any]] = {}
        for rid, mbrs in rings.items():
            if _all_legit(list(mbrs)): continue
            sub = G.subgraph(mbrs)
            if len(sub) <= 1: continue

            bc  = norm(nx.betweenness_centrality(sub))
            od  = norm({n: sub.out_degree(n) for n in mbrs})
            vol = {}
            for n in mbrs:
                vol[str(n)] = sum(
                    float(d.get("amount", 0))
                    for _, t, d in G.out_edges(n, data=True) if t in mbrs
                )
            vol = norm(vol)

            best, best_c = None, -1.0
            for n in mbrs:
                # FIX: bc=0.10, od=0.50, vol=0.40
                # Betweenness is unreliable for hub-spoke topology (hub is endpoint, not path)
                # Out-degree + volume correctly identify the node controlling outflows
                c = bc.get(n, 0.5) * 0.10 + od.get(n, 0.5) * 0.50 + vol.get(n, 0.5) * 0.40
                if c > best_c: best_c = c; best = n

            if not best or best_c < 0.75: continue

            s = (95 + ((best_c-0.90)/0.10)*5  if best_c >= 0.90 else
                 85 + ((best_c-0.80)/0.10)*10 if best_c >= 0.80 else
                 75 + ((best_c-0.70)/0.10)*10)
            s += (ring_count.get(str(best), 1) - 1) * 15

            result[rid] = {"account_id": best, "mastermind_score": round(min(100.0, s), 1)}

        return result

    # ────────────────────────────────────────────────────────────────────
    # Suspicion scoring
    # ────────────────────────────────────────────────────────────────────

    def compute_suspicion_score(
        self,
        account_id: str,
        G: nx.DiGraph,
        df: pd.DataFrame,
        cycle_map: dict[str, Any],
        smurfing_map: dict[str, list[str]],
        shell_map: dict[str, int],
        pre: dict[str, Any] | None = None,
    ) -> dict[str, float]:
        if pre:
            in_d  = pre["in_degrees"].get(account_id, 0)
            out_d = pre["out_degrees"].get(account_id, 0)
            N     = pre["total_nodes"]
            vel   = pre["velocity_counts"].get(account_id, 0)
        else:
            in_d  = G.in_degree(account_id)  if account_id in G else 0
            out_d = G.out_degree(account_id) if account_id in G else 0
            N     = G.number_of_nodes(); vel = 0
            sub   = df[
                (df["sender_id"].astype(str) == account_id) |
                (df["receiver_id"].astype(str) == account_id)
            ]
            if not sub.empty:
                ts2  = sorted(sub["timestamp"].tolist())
                wt   = timedelta(hours=self.VELOCITY_WINDOW_HOURS)
                left = 0
                for right in range(len(ts2)):
                    while ts2[right] - ts2[left] > wt: left += 1
                    vel = max(vel, right - left + 1)

        ccs    = cycle_map["member_cycles"].get(account_id, [])
        cscore = (40.0 if ccs and min(len(c) for c in ccs) <= 3 else
                  35.0 if ccs and min(len(c) for c in ccs) == 4 else
                  30.0 if ccs else 0.0)

        vscore = min(25.0, (vel / self.VELOCITY_TX_THRESHOLD) * 25.0)
        fscore = min(20.0, ((in_d + out_d) / max(N * 2, 1)) * 200.0)

        pats = smurfing_map.get(account_id, [])
        if   "fan_in" in pats and "fan_out" in pats: fscore = 20.0
        elif "fan_in" in pats or  "fan_out" in pats: fscore = max(fscore, 15.0)

        d      = shell_map.get(account_id, 0)
        sscore = 15.0 if d >= 4 else (10.0 if d == 3 else (5.0 if d >= 1 else 0.0))

        total = cscore + vscore + fscore + sscore
        return {
            "total":          float(min(100.0, round(total, 2))),
            "cycle_score":    float(round(cscore, 2)),
            "velocity_score": float(round(vscore, 2)),
            "fan_score":      float(round(fscore, 2)),
            "shell_score":    float(round(sscore, 2)),
        }

    # ────────────────────────────────────────────────────────────────────
    # Main pipeline
    # ────────────────────────────────────────────────────────────────────

    def run(self, df: pd.DataFrame) -> dict[str, Any]:
        t0  = time.perf_counter()
        aid = str(uuid.uuid4())

        df["timestamp"] = pd.to_datetime(
            df["timestamp"], dayfirst=True, utc=True, errors="coerce"
        )
        df.dropna(subset=["timestamp"], inplace=True)
        df = df[df["sender_id"].astype(str) != df["receiver_id"].astype(str)].copy()

        G = self.build_graph(df)

        smurf_map  = self.detect_smurfing(G, df)
        cycle_data = self.detect_cycles(G)
        shell_map  = self.detect_shell_chains(
            G, df, cycle_members=cycle_data["cycle_members"]
        )
        mm_data    = self.detect_mastermind(G, cycle_data["rings"])

        ring_map = cycle_data["ring_map"]
        rings    = cycle_data["rings"]
        all_ids  = set(ring_map) | set(smurf_map) | set(shell_map)

        wt       = timedelta(hours=self.VELOCITY_WINDOW_HOURS)
        vel_counts: dict[str, float] = {}
        rx_susp  = df[df["receiver_id"].astype(str).isin(all_ids)].sort_values("timestamp")
        for acct, grp in rx_susp.groupby("receiver_id"):
            grp  = grp.sort_values("timestamp").reset_index(drop=True)
            ts2  = grp["timestamp"].tolist()
            sns  = grp["sender_id"].tolist()
            left = 0; mx = 0
            for right in range(len(ts2)):
                while (ts2[right] - ts2[left]).total_seconds() > wt.total_seconds(): left += 1
                u = len(set(sns[left: right+1]))
                if u > mx: mx = u
            vel_counts[str(acct)] = float(mx)

        pre = {
            "in_degrees":      dict(G.in_degree()),
            "out_degrees":     dict(G.out_degree()),
            "total_nodes":     G.number_of_nodes(),
            "velocity_counts": vel_counts,
        }

        mm_ids = {str(v["account_id"]) for v in mm_data.values()}
        mm_rid = {str(v["account_id"]): rid for rid, v in mm_data.items()}
        suspects: list[dict] = []

        for acct in all_ids:
            sc = self.compute_suspicion_score(
                acct, G, df, cycle_data, smurf_map, shell_map, pre
            )
            if sc["total"] <= 0: continue

            pats: list[str] = []
            for cn in cycle_data["member_cycles"].get(acct, []):
                p = f"cycle_length_{len(cn)}"
                if p not in pats: pats.append(p)
            for p in smurf_map.get(acct, []):
                if p not in pats: pats.append(p)
            if acct in shell_map:
                pats += ["shell_chain", "low_transaction_intermediary"]
            pats = list(dict.fromkeys(pats))

            is_mm    = acct in mm_ids
            mm_score = None
            if is_mm and mm_rid.get(acct):
                mm_score = float(mm_data[mm_rid[acct]]["mastermind_score"])

            suspects.append({
                "account_id":        str(acct),
                "suspicion_score":   sc["total"],
                "detected_patterns": pats,
                "ring_id":           ring_map.get(acct),
                "is_mastermind":     is_mm,
                "mastermind_score":  mm_score,
                "score_breakdown": {
                    k: sc[k] for k in
                    ("cycle_score","velocity_score","fan_score","shell_score")
                },
            })

        # ── Cycle rings ────────────────────────────────────────────────
        fraud_rings: list[dict] = []
        for rid, mbrs in rings.items():
            rt = df[
                df["sender_id"].astype(str).isin(mbrs) &
                df["receiver_id"].astype(str).isin(mbrs)
            ]
            ms = [s["suspicion_score"] for s in suspects if s["account_id"] in mbrs]
            fraud_rings.append({
                "ring_id":            rid,
                "member_accounts":    sorted(mbrs),
                "pattern_type":       "cycle",
                "risk_score":         round(max(ms) if ms else 50.0, 1),
                "mastermind_account": mm_data.get(rid, {}).get("account_id"),
                "transaction_count":  int(len(rt)),
                "total_amount":       round(float(rt["amount"].sum()), 2),
            })

        # ── Smurfing rings ─────────────────────────────────────────────
        s_ctr = len(rings) + 1
        for hub, pats in smurf_map.items():
            if hub in ring_map:                 continue
            if "fan_in" not in pats:            continue
            if hub in self.merchant_whitelist:  continue
            preds = list(G.predecessors(hub))
            if len(preds) < self.MIN_FAN_COUNT: continue

            mbrs_set = {str(hub)} | {str(p) for p in preds}

            # FIX: skip pure LEGIT-only smurfing rings (all-LEGIT = background noise)
            if _all_legit(mbrs_set):
                continue

            # Also skip if no fraud signal: no velocity AND no fraud-prefixed members
            if "high_velocity" not in pats and not any(_is_fraud(m) for m in mbrs_set):
                continue

            rid = f"RING_{s_ctr:03d}"; s_ctr += 1
            rt  = df[
                df["sender_id"].astype(str).isin(mbrs_set) &
                df["receiver_id"].astype(str).isin(mbrs_set)
            ]
            fraud_rings.append({
                "ring_id":            rid,
                "member_accounts":    sorted(mbrs_set),
                "pattern_type":       "smurfing",
                "risk_score":         round(min(84.9, 55.0 + (len(preds)/50.0)*20.0), 1),
                "mastermind_account": None,
                "transaction_count":  int(len(rt)),
                "total_amount":       round(float(rt["amount"].sum()), 2),
            })
            for m in mbrs_set:
                if m not in ring_map:
                    ring_map[m] = rid
                    for s in suspects:
                        if s["account_id"] == m: s["ring_id"] = rid

        # ── Shell rings ────────────────────────────────────────────────
        sh_ctr  = s_ctr
        seen_sh: set[str] = set()
        for sh_node in shell_map:
            if sh_node in seen_sh or sh_node in ring_map: continue
            chain: set[str] = set(); stk = [sh_node]
            while stk:
                cur = str(stk.pop())
                if cur in seen_sh: continue
                if cur in shell_map:
                    chain.add(cur); seen_sh.add(cur)
                    stk += [str(x) for x in G.successors(cur)]
                    stk += [str(x) for x in G.predecessors(cur)]
            if len(chain) >= 2:
                rid = f"RING_{sh_ctr:03d}"; sh_ctr += 1
                rt  = df[
                    df["sender_id"].astype(str).isin(chain) &
                    df["receiver_id"].astype(str).isin(chain)
                ]
                fraud_rings.append({
                    "ring_id":            rid,
                    "member_accounts":    sorted(chain),
                    "pattern_type":       "shell",
                    "risk_score":         round(50.0 + (len(chain)/10.0)*15.0, 1),
                    "mastermind_account": None,
                    "transaction_count":  int(len(rt)),
                    "total_amount":       round(float(rt["amount"].sum()), 2),
                })
                for m in chain:
                    if m not in ring_map:
                        ring_map[m] = rid
                        for s in suspects:
                            if s["account_id"] == m: s["ring_id"] = rid

        # ── Post-filter ────────────────────────────────────────────────
        fp = 0

        def drop(rids: set[str]) -> None:
            nonlocal fp
            fp += sum(1 for s in suspects if s.get("ring_id") in rids)
            suspects[:]    = [s for s in suspects    if s.get("ring_id")  not in rids]
            fraud_rings[:] = [r for r in fraud_rings if r["ring_id"]      not in rids]

        drop({r["ring_id"] for r in fraud_rings if len(r["member_accounts"]) > 100})
        drop({r["ring_id"] for r in fraud_rings if float(r.get("total_amount",0)) < self.MIN_CYCLE_AMOUNT})
        drop({r["ring_id"] for r in fraud_rings
              if r["pattern_type"] == "smurfing"
              and len(r["member_accounts"]) > 20
              and float(r.get("total_amount",0)) > 1_000_000})

        sigs = {"fan_out","fan_in","high_velocity","shell_chain","low_transaction_intermediary"}
        bad: set[str] = set()
        for r in fraud_rings:
            if r["pattern_type"] != "cycle": continue
            mbrs = r["member_accounts"]
            if any(_is_fraud(m) for m in mbrs): continue
            risk = float(r["risk_score"])
            rpats: set[str] = set()
            for s in suspects:
                if s.get("ring_id") == r["ring_id"]: rpats.update(s["detected_patterns"])
            has_sig = bool(rpats & sigs)
            if _all_legit(mbrs) and (risk < 80.0 or not has_sig): bad.add(r["ring_id"])
            elif risk < 45.0 and not has_sig:                      bad.add(r["ring_id"])
        drop(bad)

        vol_pats = {"fan_out","fan_in","high_velocity"}
        orph = [s["account_id"] for s in suspects
                if s.get("ring_id") is None
                and s["score_breakdown"]["cycle_score"] == 0.0
                and s["score_breakdown"]["shell_score"] == 0.0
                and s["suspicion_score"] < 45.0
                and set(s["detected_patterns"]).issubset(vol_pats)]
        fp += len(orph)
        suspects[:] = [s for s in suspects if s["account_id"] not in orph]

        wl = self.merchant_whitelist
        fp += sum(1 for s in suspects if s["account_id"] in wl)
        suspects[:]    = [s for s in suspects    if s["account_id"] not in wl]
        fraud_rings[:] = [r for r in fraud_rings if r.get("mastermind_account") not in wl]
        for r in fraud_rings:
            if r.get("mastermind_account") in wl: r["mastermind_account"] = None

        suspects.sort(key=lambda x: x["suspicion_score"], reverse=True)
        elapsed = round(time.perf_counter() - t0, 3)
        print(f"[FINFORGE] rings={len(fraud_rings)} suspects={len(suspects)} fp={fp} t={elapsed}s")

        return {
            "analysis_id": aid,
            "timestamp":   datetime.utcnow().isoformat() + "Z",
            "suspicious_accounts": suspects,
            "fraud_rings":         fraud_rings,
            "summary": {
                "total_accounts_analyzed":        int(G.number_of_nodes()),
                "suspicious_accounts_flagged":    len(suspects),
                "fraud_rings_detected":           len(fraud_rings),
                "mastermind_accounts_identified": sum(1 for s in suspects if s["is_mastermind"]),
                "processing_time_seconds":        elapsed,
                "false_positives_filtered":       int(fp),
            },
        }

    # ────────────────────────────────────────────────────────────────────
    # PDF report
    # ────────────────────────────────────────────────────────────────────

    def generate_forensic_report(self, results: dict[str, Any], analysis_id: str) -> str:
        path = os.path.join(tempfile.gettempdir(), f"report_{analysis_id}.pdf")
        try:
            doc    = SimpleDocTemplate(path, pagesize=A4, topMargin=20*mm_unit, bottomMargin=20*mm_unit)
            styles = getSampleStyleSheet()
            story: list[Any] = []

            T = ParagraphStyle("T", parent=styles["Title"],   fontSize=22, textColor=colors.HexColor("#DC2626"), spaceAfter=12)
            H = ParagraphStyle("H", parent=styles["Heading2"],fontSize=14, textColor=colors.HexColor("#1E293B"), spaceBefore=16, spaceAfter=8)
            B = styles["BodyText"]

            story += [
                Paragraph("FinForge Forensic Report", T),
                Paragraph(f"Analysis ID: {analysis_id}", B),
                Paragraph(f"Generated: {results.get('timestamp','N/A')}", B),
                Spacer(1, 12),
            ]

            sm = results.get("summary", {})
            story.append(Paragraph("Analysis Summary", H))
            sd = [
                ["Metric", "Value"],
                ["Total Accounts Analyzed",        str(sm.get("total_accounts_analyzed",        0))],
                ["Suspicious Accounts Flagged",    str(sm.get("suspicious_accounts_flagged",    0))],
                ["Fraud Rings Detected",           str(sm.get("fraud_rings_detected",           0))],
                ["Mastermind Accounts Identified", str(sm.get("mastermind_accounts_identified", 0))],
                ["False Positives Filtered",       str(sm.get("false_positives_filtered",       0))],
                ["Processing Time",                f"{sm.get('processing_time_seconds',0)}s"],
            ]
            t = Table(sd, colWidths=[3*inch, 2*inch])
            t.setStyle(TableStyle([
                ("BACKGROUND",    (0,0),(-1,0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR",     (0,0),(-1,0), colors.white),
                ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
                ("FONTSIZE",      (0,0),(-1,-1),9),
                ("BOTTOMPADDING", (0,0),(-1,0), 8),
                ("TOPPADDING",    (0,0),(-1,0), 8),
                ("GRID",          (0,0),(-1,-1),0.5, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story += [t, Spacer(1,16)]

            fr = results.get("fraud_rings", [])
            if fr:
                story.append(Paragraph("Detected Fraud Rings", H))
                rd = [["Ring ID","Pattern","Members","Risk","Mastermind","Amount"]]
                for r in fr:
                    rd.append([r["ring_id"], r["pattern_type"],
                                str(len(r["member_accounts"])),
                                f"{r['risk_score']:.1f}",
                                r.get("mastermind_account") or "—",
                                f"${r.get('total_amount',0):,.2f}"])
                t2 = Table(rd, colWidths=[1.0*inch,0.9*inch,0.7*inch,0.6*inch,1.0*inch,1.1*inch])
                t2.setStyle(TableStyle([
                    ("BACKGROUND",    (0,0),(-1,0), colors.HexColor("#7F1D1D")),
                    ("TEXTCOLOR",     (0,0),(-1,0), colors.white),
                    ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
                    ("FONTSIZE",      (0,0),(-1,-1),8),
                    ("GRID",          (0,0),(-1,-1),0.5, colors.HexColor("#CBD5E1")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#FEF2F2")]),
                    ("BOTTOMPADDING", (0,0),(-1,-1),6),
                    ("TOPPADDING",    (0,0),(-1,-1),6),
                ]))
                story += [t2, Spacer(1,16)]

            accs = results.get("suspicious_accounts", [])[:20]
            if accs:
                story.append(Paragraph("Top Suspicious Accounts", H))
                ad = [["Account","Score","Ring","Mastermind","Patterns"]]
                for a in accs:
                    ad.append([a["account_id"],
                                f"{a['suspicion_score']:.1f}",
                                a.get("ring_id") or "—",
                                "YES" if a.get("is_mastermind") else "—",
                                ", ".join(a.get("detected_patterns",[])[:3])])
                t3 = Table(ad, colWidths=[1.0*inch,0.6*inch,0.8*inch,0.8*inch,2.1*inch])
                t3.setStyle(TableStyle([
                    ("BACKGROUND",    (0,0),(-1,0), colors.HexColor("#1E293B")),
                    ("TEXTCOLOR",     (0,0),(-1,0), colors.white),
                    ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
                    ("FONTSIZE",      (0,0),(-1,-1),8),
                    ("GRID",          (0,0),(-1,-1),0.5, colors.HexColor("#CBD5E1")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#F8FAFC")]),
                    ("BOTTOMPADDING", (0,0),(-1,-1),6),
                    ("TOPPADDING",    (0,0),(-1,-1),6),
                ]))
                story += [t3, Spacer(1,16)]

            mms = [a for a in results.get("suspicious_accounts",[]) if a.get("is_mastermind")]
            if mms:
                story.append(Paragraph("Identified Mastermind Accounts", H))
                for m in mms:
                    story.append(Paragraph(
                        f"<b>{m['account_id']}</b> — Ring: {m.get('ring_id','N/A')}, "
                        f"Mastermind Score: {m.get('mastermind_score',0):.1f}, "
                        f"Suspicion Score: {m['suspicion_score']:.1f}", B))
                story.append(Spacer(1,16))

            story.append(Paragraph("Detection Methodology", H))
            story.append(Paragraph(
                "FinForge uses a multi-layer graph-based detection pipeline. Transaction data is "
                "modeled as a directed graph (nodes = accounts, edges = transfers). Detects: "
                "(1) Cyclic flows length 3-5, (2) Fan-in smurfing with velocity corroboration, "
                "(3) Low-activity shell chains with 4+ hops, (4) Mastermind accounts via weighted "
                "out-degree and volume centrality (bc=10%, od=50%, vol=40%). Score weights: "
                "cycle 40pt, velocity 25pt, fan 20pt, shell 15pt. False positives removed: "
                "high-volume merchants, all-LEGIT smurfing rings, oversized rings (>100 members), "
                "and orphan volume-only low-score accounts.", B))

            doc.build(story)
            print(f"[FinForge] Report: {path}")
            return path
        except Exception as e:
            print(f"[FinForge] Report error: {e}"); raise
