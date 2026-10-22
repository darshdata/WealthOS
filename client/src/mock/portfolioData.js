/**
 * WEALTHOS MOCK DATA REPOSITORY
 * 
 * Note: This data is statically defined for Task 1 frontend shell scaffolding.
 * It will be replaced by dynamic API endpoints and MongoDB collections in upcoming sprint tasks.
 */

export const MOCK_IS_ACTIVE = true;

export const MOCK_PORTFOLIO_SUMMARY = {
  accountName: "Primary Growth Portfolio",
  accountNumber: "WOS-8829-410",
  currency: "USD",
  totalValue: 142850.40,
  dayChange: 1840.15,
  dayChangePercent: 1.31,
  investedCapital: 115000.00,
  unrealizedProfit: 27850.40,
  unrealizedProfitPercent: 24.22,
  sharpeRatio: 1.84,
  cashBalance: 11428.00,
  lastUpdated: "2026-10-13 16:30:00 EST",
};

export const MOCK_PERFORMANCE_HISTORY = [
  { date: "Oct 01", portfolio: 132400, benchmark: 130000 },
  { date: "Oct 03", portfolio: 133800, benchmark: 131200 },
  { date: "Oct 05", portfolio: 131900, benchmark: 129800 },
  { date: "Oct 07", portfolio: 134500, benchmark: 131400 },
  { date: "Oct 09", portfolio: 136200, benchmark: 132100 },
  { date: "Oct 11", portfolio: 135800, benchmark: 132900 },
  { date: "Oct 13", portfolio: 138400, benchmark: 134000 },
  { date: "Oct 15", portfolio: 137900, benchmark: 133500 },
  { date: "Oct 17", portfolio: 140100, benchmark: 135200 },
  { date: "Oct 19", portfolio: 139500, benchmark: 135800 },
  { date: "Oct 21", portfolio: 141200, benchmark: 136400 },
  { date: "Oct 23", portfolio: 142850, benchmark: 137100 },
];

export const MOCK_ASSET_ALLOCATION = [
  { name: "Equities / Tech", value: 78567, percentage: 55, color: "#10b981" },
  { name: "Fixed Income & Bonds", value: 28570, percentage: 20, color: "#3b82f6" },
  { name: "Crypto & Digital Assets", value: 21427, percentage: 15, color: "#8b5cf6" },
  { name: "Commodities & Gold", value: 8571, percentage: 6, color: "#f59e0b" },
  { name: "Cash Reserve", value: 5715, percentage: 4, color: "#64748b" },
];

export const MOCK_TOP_ASSETS = [
  { ticker: "NVDA", name: "NVIDIA Corp.", allocation: "22.4%", value: "$31,998.48", change: "+4.12%", positive: true },
  { ticker: "MSFT", name: "Microsoft Corp.", allocation: "18.1%", value: "$25,856.00", change: "+1.24%", positive: true },
  { ticker: "AAPL", name: "Apple Inc.", allocation: "14.5%", value: "$20,713.30", change: "-0.45%", positive: false },
  { ticker: "BTC", name: "Bitcoin ETF", allocation: "10.0%", value: "$14,285.00", change: "+6.80%", positive: true },
  { ticker: "TLT", name: "20+ Year Treasury Bond", allocation: "8.5%", value: "$12,142.28", change: "+0.15%", positive: true },
];
