import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Transaction, AnalysisResult, DetectionPattern } from '../types';
import NodeTooltip from './NodeTooltip';
import RingIsolationControls from './RingIsolationControls';

function buildElements(
  transactions: Transaction[],
  result: AnalysisResult | null
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const nodeSet = new Set<string>();
  const suspMap = new Map<string, AnalysisResult['suspicious_accounts'][0]>();
  const mastermindSet = new Set<string>();

  if (result) {
    for (const sa of result.suspicious_accounts) {
      suspMap.set(sa.account_id, sa);
      if (sa.is_mastermind) mastermindSet.add(sa.account_id);
    }
  }

  for (const tx of transactions) {
    nodeSet.add(tx.sender_id);
    nodeSet.add(tx.receiver_id);
  }

  for (const nodeId of nodeSet) {
    const sa = suspMap.get(nodeId);
    elements.push({
      data: {
        id: nodeId,
        label: sa?.is_mastermind ? `${nodeId} 👑` : nodeId,
        suspicion_score: sa?.suspicion_score ?? 0,
        detected_patterns: sa?.detected_patterns ?? [],
        ring_id: sa?.ring_id ?? '',
        isSuspicious: !!sa,
        isMastermind: mastermindSet.has(nodeId),
      },
    });
  }

  // Aggregate edges by sender-receiver pair
  const edgeMap = new Map<string, { amount: number; count: number; txId: string; timestamps: string[] }>();
  for (const tx of transactions) {
    const key = `${tx.sender_id}__${tx.receiver_id}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.amount += tx.amount;
      existing.count += 1;
      existing.timestamps.push(tx.timestamp);
    } else {
      edgeMap.set(key, { amount: tx.amount, count: 1, txId: tx.transaction_id, timestamps: [tx.timestamp] });
    }
  }

  let eIdx = 0;
  for (const [key, { amount, txId, timestamps }] of edgeMap.entries()) {
    const [src, tgt] = key.split('__');
    // Store the earliest timestamp for timeline filtering
    const minTs = Math.min(...timestamps.map(t => new Date(t).getTime()));
    elements.push({
      data: {
        id: `e_${eIdx++}`,
        source: src,
        target: tgt,
        amount,
        transaction_id: txId,
        edgeTimestamp: minTs,
      },
    });
  }

  return elements;
}

export default function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const {
    transactions,
    analysisResult,
    selectedNodeId,
    currentTimelinePosition,
    isolatedRingId,
    forensicCardAccount,
    setSelectedNodeId,
    setTooltip,
    setForensicCardAccount,
  } = useStore();

  const destroyCy = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || transactions.length === 0) return;
    destroyCy();

    const elements = buildElements(transactions, analysisResult);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#475569',
            'border-color': '#64748b',
            'border-width': 1.5,
            'width': 28,
            'height': 28,
            'label': 'data(label)',
            'font-size': 9,
            'color': '#94a3b8',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-outline-width': 0,
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'node[?isSuspicious]',
          style: {
            'background-color': '#ef4444',
            'border-color': '#fca5a5',
            'border-width': 2.5,
            'width': 40,
            'height': 40,
            'color': '#fca5a5',
            'font-weight': 'bold',
          },
        },
        {
          selector: 'node[?isMastermind]',
          style: {
            'shape': 'octagon',
            'background-color': '#eab308',
            'border-color': '#fde047',
            'border-width': 4,
            'width': 55,
            'height': 55,
            'color': '#fde047',
            'font-size': 10,
            'font-weight': 'bold',
            'text-outline-color': '#1e293b',
            'text-outline-width': 1.5,
          },
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#f59e0b',
            'border-width': 3,
            'background-color': '#d97706',
          },
        },
        {
          selector: 'node.dimmed',
          style: {
            'opacity': 0.15,
          },
        },
        {
          selector: 'node.timeline-dimmed',
          style: {
            'opacity': 0.2,
          },
        },
        {
          selector: 'node.ring-isolated',
          style: {
            'width': 56,
            'height': 56,
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#334155',
            'line-color': '#334155',
            'width': 2,
            'arrow-scale': 0.8,
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'edge.suspicious-edge',
          style: {
            'line-color': '#7f1d1d',
            'target-arrow-color': '#7f1d1d',
          },
        },
        {
          selector: 'edge.highlighted-edge',
          style: {
            'line-color': '#f59e0b',
            'target-arrow-color': '#f59e0b',
          },
        },
        {
          selector: 'edge.dimmed',
          style: {
            'opacity': 0.1,
          },
        },
        {
          selector: 'edge.timeline-hidden',
          style: {
            'opacity': 0,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 80,
        edgeElasticity: () => 100,
        gravity: 0.25,
        numIter: 1000,
        fit: true,
        padding: 30,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Color suspicious edges
    cy.edges().forEach(edge => {
      const src = edge.source();
      const tgt = edge.target();
      if (src.data('isSuspicious') && tgt.data('isSuspicious')) {
        edge.addClass('suspicious-edge');
      }
    });

    // Node hover tooltip
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const pos = evt.renderedPosition;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltip({
        visible: true,
        x: rect.left + pos.x,
        y: rect.top + pos.y,
        nodeData: {
          id: node.id(),
          label: node.id(),
          suspicion_score: node.data('suspicion_score') as number,
          detected_patterns: node.data('detected_patterns') as DetectionPattern[],
          ring_id: node.data('ring_id') as string,
          isSuspicious: node.data('isSuspicious') as boolean,
          isMastermind: node.data('isMastermind') as boolean,
        },
      });
    });

    cy.on('mouseout', 'node', () => {
      setTooltip({ visible: false, x: 0, y: 0, nodeData: null });
    });

    // Node click: highlight connected + open forensic card for suspicious nodes
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.id() as string;

      cy.elements().removeClass('highlighted highlighted-edge');

      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
        setForensicCardAccount(null);
      } else {
        setSelectedNodeId(nodeId);
        node.addClass('highlighted');
        node.connectedEdges().addClass('highlighted-edge');
        node.connectedEdges().connectedNodes().addClass('highlighted');

        // Open forensic card if suspicious
        if (node.data('isSuspicious')) {
          setForensicCardAccount(nodeId);
        } else {
          setForensicCardAccount(null);
        }
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('highlighted highlighted-edge');
        setSelectedNodeId(null);
        setForensicCardAccount(null);
      }
    });

    cyRef.current = cy;

    return () => destroyCy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, analysisResult, destroyCy, setTooltip, setSelectedNodeId, setForensicCardAccount]);

  // Timeline filtering effect
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.edges().forEach(edge => {
      edge.removeClass('timeline-hidden');
    });
    cy.nodes().forEach(node => {
      node.removeClass('timeline-dimmed');
    });

    if (currentTimelinePosition === null) return;

    // Hide edges that occur after the current timeline position
    cy.edges().forEach(edge => {
      const edgeTs = edge.data('edgeTimestamp') as number;
      if (edgeTs && edgeTs > currentTimelinePosition) {
        edge.addClass('timeline-hidden');
      }
    });

    // Dim nodes with no visible edges
    cy.nodes().forEach(node => {
      const visibleEdges = node.connectedEdges().filter(e => !e.hasClass('timeline-hidden'));
      if (visibleEdges.length === 0) {
        node.addClass('timeline-dimmed');
      }
    });
  }, [currentTimelinePosition]);

  // Ring isolation effect
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !analysisResult) return;

    cy.elements().removeClass('dimmed ring-isolated');

    if (!isolatedRingId) return;

    const ring = analysisResult.fraud_rings.find(r => r.ring_id === isolatedRingId);
    if (!ring) return;

    const memberSet = new Set(ring.member_accounts);

    cy.nodes().forEach(node => {
      if (!memberSet.has(node.id())) {
        node.addClass('dimmed');
      } else {
        node.addClass('ring-isolated');
      }
    });

    cy.edges().forEach(edge => {
      const srcId = edge.source().id();
      const tgtId = edge.target().id();
      if (!memberSet.has(srcId) || !memberSet.has(tgtId)) {
        edge.addClass('dimmed');
      }
    });
  }, [isolatedRingId, analysisResult]);

  const zoomIn = () => cyRef.current?.zoom({ level: (cyRef.current.zoom() || 1) * 1.3, renderedPosition: cyRef.current.container()?.getBoundingClientRect() ? { x: (cyRef.current.container()!.clientWidth / 2), y: (cyRef.current.container()!.clientHeight / 2) } : { x: 0, y: 0 } });
  const zoomOut = () => cyRef.current?.zoom({ level: (cyRef.current.zoom() || 1) / 1.3, renderedPosition: { x: (cyRef.current.container()?.clientWidth ?? 0) / 2, y: (cyRef.current.container()?.clientHeight ?? 0) / 2 } });
  const fitScreen = () => cyRef.current?.fit(undefined, 30);
  const resetView = () => { cyRef.current?.reset(); cyRef.current?.fit(undefined, 30); };

  return (
    <div className={`relative w-full h-full min-h-[400px] bg-slate-950 transition-all duration-300 ${forensicCardAccount ? 'lg:mr-[380px]' : ''}`}>
      <div ref={containerRef} className="w-full h-full" />

      <RingIsolationControls />

      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        {[
          { Icon: ZoomIn, action: zoomIn, title: 'Zoom In' },
          { Icon: ZoomOut, action: zoomOut, title: 'Zoom Out' },
          { Icon: Maximize2, action: fitScreen, title: 'Fit Screen' },
          { Icon: RotateCcw, action: resetView, title: 'Reset' },
        ].map(({ Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors shadow-lg"
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-300" />
          <span>Suspicious</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 bg-yellow-500 border-2 border-yellow-300" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />
          <span>Mastermind</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-500 border border-slate-600" />
          <span>Legitimate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-slate-600" />
          <span>Transaction flow</span>
        </div>
      </div>

      <NodeTooltip />
    </div>
  );
}
