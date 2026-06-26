export const MOCK_COMPANY = {
  ticker: "AAPL",
  name: "Apple Inc.",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Consumer Electronics",
  ceo: "Tim Cook",
  founded: "1976",
  employees: "161,000",
  headquarters: "Cupertino, CA",
  website: "apple.com",
  country: "USA",
  description: "Apple Inc. is a global technology company specializing in consumer electronics, software, and digital services. The company generates revenue primarily from iPhone, Mac, Services, and Wearables.",
  livePrice: 191.73,
  changePercent: 1.25,
  marketCap: "$2.98T",
  volume: "48.2M",
  high52: "$199.62",
  low52: "$164.08",
  prevClose: "$189.36",
  open: "$190.12",
  dayHigh: "$192.15",
  dayLow: "$189.85",
  metrics: [
    { label: "P/E Ratio", value: "29.5", status: "neutral" },
    { label: "Forward P/E", value: "27.1", status: "favorable" },
    { label: "EPS", value: "$6.42", status: "favorable" },
    { label: "PEG Ratio", value: "2.1", status: "neutral" },
    { label: "Price / Book", value: "42.3", status: "unfavorable" },
    { label: "Price / Sales", value: "7.8", status: "neutral" },
    { label: "Dividend Yield", value: "0.52%", status: "neutral" },
    { label: "Beta", value: "1.28", status: "unfavorable" },
    { label: "Avg Volume", value: "52.4M", status: "neutral" },
    { label: "Shares Out", value: "15.55B", status: "neutral" }
  ],
  snapshot: [
    { label: "Revenue", value: "$383.3B" },
    { label: "Net Income", value: "$97.0B" },
    { label: "Gross Margin", value: "44.1%" },
    { label: "Operating Margin", value: "29.8%" },
    { label: "Free Cash Flow", value: "$99.6B" },
    { label: "Cash", value: "$61.6B" },
    { label: "Debt", value: "$111.1B" },
    { label: "Enterprise Value", value: "$3.03T" },
    { label: "ROE", value: "156.1%" },
    { label: "ROA", value: "28.4%" },
    { label: "ROIC", value: "54.2%" }
  ],
  aiSummary: {
    overview: "Apple continues to demonstrate strong profitability driven by Services and premium hardware. Risks include supply chain dependence and slowing smartphone growth.",
    strengths: ["Sticky ecosystem", "High pricing power", "Growing services revenue"],
    risks: ["China market weakness", "Antitrust scrutiny", "Hardware upgrade cycles lengthening"],
    drivers: ["Vision Pro adoption", "AI feature rollouts", "Wearables expansion"]
  },
  quickFacts: {
    status: "Market Open",
    sectorRank: "#1 in Technology",
    latestEarnings: "May 2, 2024",
    nextEarnings: "Aug 1, 2024",
    currency: "USD",
    fiscalYearEnd: "September"
  }
};

export const MOCK_CHART_DATA = Array.from({ length: 100 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (100 - i));
  const base = 150 + (i * 0.4);
  const random = (Math.random() - 0.5) * 5;
  return {
    date: date.toISOString().split('T')[0],
    price: +(base + random).toFixed(2),
    volume: Math.floor(Math.random() * 50000) + 20000
  };
});
