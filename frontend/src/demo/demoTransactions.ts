import { toISODate } from "../utils/DateRange";
import type { Transaction } from "../types/models";

export interface DemoAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: "chequing" | "savings" | "credit_card";
  starting_balance: number;
  created_at: string;
}

const DEMO_USER_ID = "demo-user";

const BASE_ACCOUNTS: DemoAccount[] = [
  {
    id: "demo-chequing",
    user_id: DEMO_USER_ID,
    name: "Everyday Chequing",
    account_type: "chequing",
    starting_balance: 2000,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "demo-savings",
    user_id: DEMO_USER_ID,
    name: "Emergency Savings",
    account_type: "savings",
    starting_balance: 5000,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "demo-credit-card",
    user_id: DEMO_USER_ID,
    name: "Rewards Visa",
    account_type: "credit_card",
    starting_balance: 0,
    created_at: "2025-01-01T00:00:00Z",
  },
];

function monthAdd(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function weeklyDates(start: Date, end: Date, weekday: number): Date[] {
  const d = new Date(start);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  const out: Date[] = [];
  while (d <= end) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function monthlyDates(start: Date, end: Date, dayOfMonth: number): Date[] {
  const out: Date[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
    // Guard against day-of-month overflow rolling into the next month
    // (e.g. day 30 in February) — same guard as the Python generator.
    if (d.getMonth() === cursor.getMonth() && d >= start && d <= end) out.push(d);
    cursor = monthAdd(cursor, 1);
  }
  return out;
}

// Small deterministic PRNG so amounts are stable across calls within a
// session, without pulling in a dependency. Reseeded on every call to
// getDemoTransactions() so a given calendar day's data stays consistent.
let seed = 42;
function rand(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function uniform(min: number, max: number): number {
  return min + rand() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

let txnCounter = 0;
function makeTxn(
  accountId: string,
  accountType: string,
  d: Date,
  description: string,
  amount: number,
  category: string,
  isAnomaly = false
): Transaction {
  txnCounter += 1;
  const isInternalTransfer = category === "Transfer" || category === "Savings";
  return {
    id: `demo-txn-${txnCounter}`,
    user_id: DEMO_USER_ID,
    batch_id: "demo-batch",
    account_id: accountId,
    date: toISODate(d),
    description,
    amount: Math.round(amount * 100) / 100,
    category,
    account_type: accountType,
    is_anomaly: isAnomaly,
    // Transfer/Savings rows are permanently unscored (null), matching real
    // backend behavior. Everything else gets a small non-anomalous score
    // unless flagged, or a high score if it's one of the deliberate outliers.
    anomaly_score: isInternalTransfer
      ? null
      : Math.round((isAnomaly ? uniform(0.7, 0.95) : uniform(0.05, 0.3)) * 100) / 100,
    created_at: d.toISOString(),
  } as Transaction;
}

function buildRange(): { start: Date; end: Date } {
  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: monthAdd(startMonth, -3), end: today };
}

function generateChequing(start: Date, end: Date, accountId: string): Transaction[] {
  const rows: Transaction[] = [];
  const type = "chequing";

  weeklyDates(start, end, 5)
    .filter((_, i) => i % 2 === 0)
    .forEach((d) => rows.push(makeTxn(accountId, type, d, "PAYROLL DEPOSIT ACME CORP", uniform(1850, 1950), "Income")));

  monthlyDates(start, end, 1).forEach((d) =>
    // Deliberately avoids "E-TRANSFER"/"BILL PAYMENT" so it isn't
    // misclassified as Transfer by the transfer-detection heuristic.
    rows.push(makeTxn(accountId, type, d, "RENT PAYMENT - LANDLORD", -1250, "Rent/Mortgage"))
  );

  monthlyDates(start, end, 5).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "HYDRO ONE UTILITY BILL", -uniform(75, 140), "Utilities"))
  );

  const groceries = ["LOBLAWS", "WALMART SUPERCENTER", "COSTCO WHOLESALE", "NO FRILLS"];
  weeklyDates(start, end, 6).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, pick(groceries), -uniform(60, 160), "Groceries"))
  );

  const dining = ["TIM HORTONS", "STARBUCKS", "UBER EATS", "MCDONALDS", "SUBWAY"];
  [2, 5].forEach((wd) =>
    weeklyDates(start, end, wd).forEach((d) =>
      rows.push(makeTxn(accountId, type, d, pick(dining), -uniform(6, 25), "Food"))
    )
  );

  const transport = ["PETRO CANADA", "SHELL GAS", "PRESTO FARE"];
  weeklyDates(start, end, 3)
    .filter((_, i) => i % 2 === 0)
    .forEach((d) => rows.push(makeTxn(accountId, type, d, pick(transport), -uniform(15, 70), "Transport")));

  monthlyDates(start, end, 15).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "NETFLIX SUBSCRIPTION", -15.99, "Entertainment"))
  );
  monthlyDates(start, end, 20).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "SPOTIFY PREMIUM", -11.99, "Entertainment"))
  );

  const shopping = ["AMAZON.CA", "BEST BUY", "H&M STORE"];
  monthlyDates(start, end, 10).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, pick(shopping), -uniform(30, 120), "Shopping"))
  );

  // Uses the exact is_savings() trigger phrase: "TO FIND & SAVE"
  weeklyDates(start, end, 1).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "TO FIND & SAVE", -25, "Savings"))
  );

  // Uses the exact is_transfer() trigger phrase: "BILL PAYMENT"
  monthlyDates(start, end, 25).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "BILL PAYMENT - VISA CREDIT CARD", -uniform(350, 500), "Transfer"))
  );

  // Deliberate anomaly, dated within last month so it falls inside
  // /insights' "last month + current month" anomaly_count window — not just
  // inside the all-time window the overlay itself queries. Anchored to
  // `end` (today), not `start`, so it stays in that window regardless of
  // how far back the 3-month history range goes.
  const anomalyDate = new Date(end.getFullYear(), end.getMonth() - 1, 12);
  if (anomalyDate >= start && anomalyDate <= end) {
    rows.push(makeTxn(accountId, type, anomalyDate, "ELECTRONICS MEGASTORE", -1499, "Shopping", true));
  }

  return rows;
}

function generateSavings(start: Date, end: Date, accountId: string): Transaction[] {
  const rows: Transaction[] = [];
  const type = "savings";

  weeklyDates(start, end, 1).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "TO FIND & SAVE", 25, "Savings"))
  );
  monthlyDates(start, end, 28).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "INTEREST PAID", uniform(2, 4), "Income"))
  );

  // Uses the exact is_transfer() trigger phrase: "ONLINE TRANSFER"
  const withdrawalDate = new Date(start);
  withdrawalDate.setDate(withdrawalDate.getDate() + 70);
  if (withdrawalDate <= end) {
    rows.push(makeTxn(accountId, type, withdrawalDate, "ONLINE TRANSFER TO CHEQUING", -200, "Transfer"));
  }

  return rows;
}

function generateCreditCard(start: Date, end: Date, accountId: string): Transaction[] {
  const rows: Transaction[] = [];
  const type = "credit_card";

  const discretionary = ["STEAM GAMES", "CINEPLEX", "UBER EATS", "AMAZON.CA", "H&M STORE", "STARBUCKS", "BEST BUY"];
  const categoryFor = (desc: string): string => {
    if (desc === "STEAM GAMES" || desc === "CINEPLEX") return "Entertainment";
    if (desc === "UBER EATS" || desc === "STARBUCKS") return "Food";
    return "Shopping";
  };
  [2, 5].forEach((wd) =>
    weeklyDates(start, end, wd).forEach((d) => {
      const desc = pick(discretionary);
      rows.push(makeTxn(accountId, type, d, desc, -uniform(10, 150), categoryFor(desc)));
    })
  );

  // Uses the exact is_transfer() trigger phrase: "PAYMENT - THANK YOU".
  // Amount is illustrative, not reconciled against the chequing side.
  monthlyDates(start, end, 28).forEach((d) =>
    rows.push(makeTxn(accountId, type, d, "PAYMENT - THANK YOU", uniform(350, 500), "Transfer"))
  );

  // Second deliberate anomaly, dated in the current month (a week back from
  // today) so it also falls inside the anomaly_count window — pairs with
  // the first one landing in last month.
  const anomalyDate = new Date(end);
  anomalyDate.setDate(anomalyDate.getDate() - 7);
  if (anomalyDate >= start) {
    rows.push(makeTxn(accountId, type, anomalyDate, "LUXURY WATCH BOUTIQUE", -799, "Shopping", true));
  }

  return rows;
}

let cachedTransactions: Transaction[] | null = null;
let cachedForDay: string | null = null;

export function getDemoTransactions(): Transaction[] {
  const todayKey = toISODate(new Date());
  if (cachedTransactions && cachedForDay === todayKey) return cachedTransactions;

  seed = 42;
  txnCounter = 0;
  const { start, end } = buildRange();
  const rows = [
    ...generateChequing(start, end, "demo-chequing"),
    ...generateSavings(start, end, "demo-savings"),
    ...generateCreditCard(start, end, "demo-credit-card"),
  ];
  rows.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first, matches real API ordering

  cachedTransactions = rows;
  cachedForDay = todayKey;
  return rows;
}

export function getDemoAccounts() {
  const txns = getDemoTransactions();
  return BASE_ACCOUNTS.map((acc) => {
    const balance =
      acc.starting_balance +
      txns.filter((t) => t.account_id === acc.id).reduce((sum, t) => sum + t.amount, 0);
    return { ...acc, current_balance: Math.round(balance * 100) / 100 };
  });
}