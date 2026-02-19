import { Transaction } from '../types';

function accId(num: number): string {
  return `acc_${String(num).padStart(3, '0')}`;
}

function txId(num: number): string {
  return `tx_${String(num).padStart(4, '0')}`;
}

function randAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function offsetDate(base: Date, hours: number): string {
  return new Date(base.getTime() + hours * 3_600_000).toISOString();
}

export function generateMockTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  // Spread across 7 days (168 hours) for timeline slider
  const base = new Date('2024-01-10T08:00:00Z');
  let n = 1;

  const push = (sender: string, receiver: string, amount: number, h: number) => {
    txs.push({
      transaction_id: txId(n++),
      sender_id: sender,
      receiver_id: receiver,
      amount,
      timestamp: offsetDate(base, h),
    });
  };

  // Fraud Ring 1 — Cycle acc_001 → acc_002 → acc_003 → acc_001
  // Spread over days 0-3
  for (let i = 0; i < 8; i++) {
    push(accId(1), accId(2), randAmount(8000, 15000), i * 10);
    push(accId(2), accId(3), randAmount(7500, 14500), i * 10 + 3);
    push(accId(3), accId(1), randAmount(7000, 14000), i * 10 + 6);
  }

  // Fraud Ring 2 — Smurfing: 12 senders → acc_016 (fan-in aggregator)
  // Days 2-5
  const smurfs = Array.from({ length: 12 }, (_, i) => accId(i + 4));
  const aggregator = accId(16);
  smurfs.forEach((s, si) => {
    for (let j = 0; j < 4; j++) {
      push(s, aggregator, randAmount(900, 1999), si * 4 + j * 1.5 + 48);
    }
  });
  push(aggregator, accId(22), randAmount(25000, 48000), 120);

  // Fraud Ring 3 — Shell chain: acc_017 → acc_018 → acc_019 → acc_020
  // Days 4-6
  const chain = [accId(17), accId(18), accId(19), accId(20)];
  for (let hop = 0; hop < chain.length - 1; hop++) {
    for (let j = 0; j < 6; j++) {
      push(chain[hop], chain[hop + 1], randAmount(150, 450), hop * 16 + j * 2 + 96);
    }
  }
  // Shell chain → exit node
  push(accId(20), accId(23), randAmount(2000, 5000), 155);

  // Legitimate traffic between acc_023 – acc_050 spread across all 7 days
  const legit = Array.from({ length: 28 }, (_, i) => accId(i + 23));
  const rng = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  while (txs.length < 200) {
    const s = rng(legit);
    let r = rng(legit);
    while (r === s) r = rng(legit);
    push(s, r, randAmount(200, 60000), Math.random() * 168); // 7 days = 168 hours
  }

  return txs.slice(0, 200);
}
