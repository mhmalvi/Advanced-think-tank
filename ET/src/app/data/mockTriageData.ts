export interface TriageData {
  id: string;
  headline: string;
  tldr?: string;
  sector: string;
  region: string;
  entities: string[];
  metrics: {
    sourceCount: number;
    confidence: number;
    urgency: "low" | "medium" | "high" | "critical";
  };
  timestamp: string;
  imageUrl?: string;
  relevanceScore?: number;
}

const SECTORS = ["Semiconductors", "Macro", "Tech", "Logistics", "AI", "Energy", "Geopolitics", "Finance"];
const REGIONS = ["APAC", "Europe", "Global", "Middle East", "North America", "South America"];

const TEMPLATES = [
  "Central bank hints at {action} following unexpected {metric} data.",
  "Major {sector} player announces {action} to mitigate {metric} risks.",
  "Supply chain bottlenecks in {region} exacerbate {metric} shortages.",
  "{action} by regulators disrupts {sector} consolidations.",
  "Advances in {sector} AI models trigger {action} among competitors.",
  "Geopolitical tensions in {region} lead to {action} in commodity markets.",
  "Earnings miss from {sector} bellwether signals broader {metric} weakness."
];

const ACTIONS = ["strategic pivot", "rate adjustments", "capacity expansions", "emergency measures", "legal review", "workforce reduction", "price hikes"];
const METRICS = ["inflation", "yield", "silicon", "labor", "demand", "regulatory", "freight"];

const generateMockData = (count: number): TriageData[] => {
  const data: TriageData[] = [];

  for (let i = 0; i < count; i++) {
    const isTier1 = i < 5 || Math.random() > 0.9;
    const confidence = isTier1 ? Math.floor(Math.random() * 10) + 90 : Math.floor(Math.random() * 100);

    let urgency: "low" | "medium" | "high" | "critical" = "low";
    if (confidence > 90) urgency = "critical";
    else if (confidence > 75) urgency = "high";
    else if (confidence > 50) urgency = "medium";

    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const metric = METRICS[Math.floor(Math.random() * METRICS.length)];
    const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

    let headline = template.replace("{action}", action).replace("{metric}", metric).replace("{sector}", sector).replace("{region}", region);
    headline = headline.charAt(0).toUpperCase() + headline.slice(1);

    const dataItem: TriageData = {
      id: `synth-${i}`,
      headline: headline,
      sector: sector,
      region: region,
      entities: [sector.substring(0, 4).toUpperCase(), region.substring(0, 3).toUpperCase(), `E-${Math.floor(Math.random()*100)}`],
      metrics: {
        sourceCount: Math.floor(Math.random() * 500) + 10,
        confidence: confidence,
        urgency: urgency
      },
      timestamp: `${Math.floor(Math.random() * 60)}m ago`
    };

    if (confidence >= 50) {
      dataItem.tldr = `Analysis indicates profound structural changes resulting from the recent ${action}. Stakeholders are advised to monitor ${metric} indices closely. Supply chain resilience remains the primary concern for the ${sector} sector in ${region}.`;
    }

    if (confidence >= 85) {
      dataItem.imageUrl = `https://picsum.photos/seed/${i + 1}/400/300`;
    }

    data.push(dataItem);
  }

  return data.sort((a, b) => b.metrics.confidence - a.metrics.confidence);
};

export const MOCK_TRIAGE_DATA = generateMockData(65);
