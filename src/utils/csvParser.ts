import { Transaction } from '../types';

const REQUIRED_COLUMNS = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp'];

export interface ParseResult {
  transactions: Transaction[];
  errors: string[];
}

export function parseCSV(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { transactions: [], errors: ['CSV file must have a header row and at least one data row.'] };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
  if (missing.length > 0) {
    return { transactions: [], errors: [`Missing required columns: ${missing.join(', ')}`] };
  }

  const idx = (col: string) => headers.indexOf(col);

  const transactions: Transaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map(c => c.trim());
    const amount = parseFloat(cols[idx('amount')]);
    if (isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount "${cols[idx('amount')]}"`);
      continue;
    }
    transactions.push({
      transaction_id: cols[idx('transaction_id')] || `tx_${i}`,
      sender_id: cols[idx('sender_id')],
      receiver_id: cols[idx('receiver_id')],
      amount,
      timestamp: cols[idx('timestamp')],
    });
  }

  return { transactions, errors };
}
