export interface Transaction {
  transaction_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: string;
}

export interface ScoreBreakdown {
  cycle_score: number;
  velocity_score: number;
  fan_score: number;
  shell_score: number;
}

export type DetectionPattern =
  | 'cycle_length_3'
  | 'cycle_length_4'
  | 'cycle_length_5'
  | 'high_velocity'
  | 'fan_in'
  | 'fan_out'
  | 'shell_chain'
  | 'low_transaction_intermediary';

export interface SuspiciousAccount {
  account_id: string;
  suspicion_score: number;
  detected_patterns: DetectionPattern[];
  ring_id: string | null;
  is_mastermind: boolean;
  mastermind_score: number | null;
  score_breakdown: ScoreBreakdown;
}

export interface FraudRing {
  ring_id: string;
  member_accounts: string[];
  pattern_type: string;
  risk_score: number;
  mastermind_account: string | null;
  transaction_count: number;
  total_amount: number;
}

export interface AnalysisSummary {
  total_accounts_analyzed: number;
  suspicious_accounts_flagged: number;
  fraud_rings_detected: number;
  mastermind_accounts_identified: number;
  processing_time_seconds: number;
  false_positives_filtered: number;
}

export interface AnalysisResult {
  analysis_id: string;
  timestamp: string;
  suspicious_accounts: SuspiciousAccount[];
  fraud_rings: FraudRing[];
  summary: AnalysisSummary;
}

export interface NodeData {
  id: string;
  label: string;
  suspicion_score: number;
  detected_patterns: DetectionPattern[];
  ring_id: string;
  isSuspicious: boolean;
  isMastermind: boolean;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  amount: number;
  transaction_id: string;
  timestamp: string;
}

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  nodeData: NodeData | null;
}

export interface TimelineRange {
  min: number;
  max: number;
}
