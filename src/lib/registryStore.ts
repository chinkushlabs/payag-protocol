import fs from 'fs';
import path from 'path';

export type AgentReview = {
  rating: number;
  feedback: string;
  reviewer?: `0x${string}`;
  createdAt: string;
};

export type AgentListing = {
  id: string;
  agentName: string;
  service: string;
  price: string;
  currency: string;
  workerAddress: `0x${string}`;
  endpoint?: string;
  status: 'OPEN' | 'PAUSED';
  createdAt: string;
  description?: string;
  capabilities?: string[];
  completedJobs: number;
  rating: number | null;
  reviewCount: number;
  reviews?: AgentReview[];
};

type RegistryFile = {
  listings: AgentListing[];
};

const seedListings: AgentListing[] = [
  {
    id: 'list_1',
    agentName: 'Python Debugging Bot',
    service: 'Python Debugging Bot',
    price: '5',
    currency: 'USDC',
    workerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    endpoint: 'https://agent.example/python-debugger',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Debugs Python traces, fixes runtime issues, and returns patch-ready output.',
    capabilities: ['Traceback diagnosis', 'Dependency conflict fixes', 'Patch proposals'],
    completedJobs: 14,
    rating: 4.9,
    reviewCount: 14,
    reviews: [],
  },
  {
    id: 'list_2',
    agentName: 'On-Chain Data Scraper',
    service: 'On-Chain Data Scraper',
    price: '10',
    currency: 'USDC',
    workerAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    endpoint: 'https://agent.example/onchain-scraper',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Extracts and normalizes wallet, token, and contract activity across chains.',
    capabilities: ['Token transfer indexing', 'Contract event parsing', 'CSV/JSON exports'],
    completedJobs: 8,
    rating: 4.7,
    reviewCount: 8,
    reviews: [],
  },
  {
    id: 'list_3',
    agentName: 'ML Model Fine-Tuner',
    service: 'ML Model Fine-Tuner',
    price: '50',
    currency: 'USDC',
    workerAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    endpoint: 'https://agent.example/ml-finetuner',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Tunes model checkpoints with reproducible prompts and eval artifacts.',
    capabilities: ['Dataset prep', 'Hyperparameter tuning', 'Eval summary reports'],
    completedJobs: 2,
    rating: 5,
    reviewCount: 2,
    reviews: [],
  },
  {
    id: 'list_4',
    agentName: 'Smart Contract Auditor',
    service: 'Smart Contract Auditor',
    price: '0.05',
    currency: 'ETH',
    workerAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    endpoint: 'https://agent.example/sc-auditor',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Performs security-focused contract reviews with exploit scenario mapping.',
    capabilities: ['Static analysis', 'Access-control review', 'Reentrancy checks'],
    completedJobs: 21,
    rating: 4.9,
    reviewCount: 21,
    reviews: [],
  },
];

const dataFile = path.join(process.cwd(), 'src', 'data', 'registry.json');
let inMemoryFallback: AgentListing[] = [...seedListings];

function ensureDataFile() {
  const dir = path.dirname(dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    const payload: RegistryFile = { listings: [...seedListings] };
    fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2), 'utf-8');
  }
}

function readRegistry(): AgentListing[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed = JSON.parse(raw) as RegistryFile;
    if (!Array.isArray(parsed?.listings)) return [...seedListings];
    inMemoryFallback = parsed.listings;
    return parsed.listings;
  } catch {
    return [...inMemoryFallback];
  }
}

function writeRegistry(listings: AgentListing[]) {
  inMemoryFallback = [...listings];
  try {
    ensureDataFile();
    const payload: RegistryFile = { listings };
    fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {
    // Ignore write failures in read-only environments and keep in-memory fallback.
  }
}

export function getListings(): AgentListing[] {
  const listings = readRegistry();
  return [...listings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getListingById(id: string): AgentListing | undefined {
  return readRegistry().find((listing) => listing.id === id);
}

export function addListing(
  input: Omit<AgentListing, 'id' | 'createdAt' | 'status' | 'reviewCount' | 'reviews'> & {
    status?: AgentListing['status'];
  }
): AgentListing {
  const listings = readRegistry();
  const completedJobs = Number.isFinite(input.completedJobs)
    ? Math.max(0, Math.floor(input.completedJobs))
    : 0;

  const normalizedRating =
    input.rating === null
      ? null
      : Number.isFinite(input.rating)
      ? Math.min(5, Math.max(1, input.rating))
      : null;

  const reviewCount = normalizedRating === null ? 0 : completedJobs;

  const listing: AgentListing = {
    id: `list_${Math.random().toString(36).slice(2, 10)}`,
    agentName: input.agentName,
    service: input.service,
    price: input.price,
    currency: input.currency,
    workerAddress: input.workerAddress,
    endpoint: input.endpoint,
    status: input.status ?? 'OPEN',
    createdAt: new Date().toISOString(),
    description: input.description,
    capabilities: input.capabilities,
    completedJobs,
    rating: normalizedRating,
    reviewCount,
    reviews: [],
  };

  listings.push(listing);
  writeRegistry(listings);
  return listing;
}

export function applyListingReview(input: {
  listingId?: string;
  workerAddress?: string;
  service?: string;
  rating: number;
  feedback: string;
  reviewer?: `0x${string}`;
}): AgentListing | undefined {
  const listings = readRegistry();
  const target = input.listingId
    ? listings.find((l) => l.id === input.listingId)
    : listings.find(
        (l) =>
          (!input.workerAddress || l.workerAddress.toLowerCase() === input.workerAddress.toLowerCase()) &&
          (!input.service || l.service === input.service)
      );

  if (!target) return undefined;

  const normalizedRating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const currentRating = target.rating ?? 0;
  const currentReviewCount = target.reviewCount ?? 0;
  const nextReviewCount = currentReviewCount + 1;
  const nextRating = (currentRating * currentReviewCount + normalizedRating) / nextReviewCount;

  target.reviewCount = nextReviewCount;
  target.rating = Number(nextRating.toFixed(1));
  target.completedJobs += 1;
  target.reviews = target.reviews ?? [];
  target.reviews.unshift({
    rating: normalizedRating,
    feedback: input.feedback,
    reviewer: input.reviewer,
    createdAt: new Date().toISOString(),
  });

  writeRegistry(listings);
  return target;
}
