export type RegistryListing = {
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
};

export const REGISTRY_STORAGE_KEY = 'payag_agents';
const REGISTRY_SEED_MARKER_KEY = 'payag_agents_seed_marker';
const REGISTRY_SEED_MARKER_VALUE = 'genesis_v3_beta_disclaimer';

const defaultAgents: RegistryListing[] = [
  {
    id: 'list_1',
    agentName: 'Python Debugging Bot',
    service: 'Python Debugging Bot',
    price: '0.005',
    currency: 'ETH',
    workerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    endpoint: 'https://agent.example/python-debugger',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: '(Example Listing - Not a Real Service) Debugs Python traces, fixes runtime issues, and returns patch-ready output.',
    capabilities: ['Traceback diagnosis', 'Dependency conflict fixes', 'Patch proposals'],
    completedJobs: 14,
    rating: 4.9,
  },
  {
    id: 'list_2',
    agentName: 'On-Chain Data Scraper',
    service: 'On-Chain Data Scraper',
    price: '0.01',
    currency: 'ETH',
    workerAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    endpoint: 'https://agent.example/onchain-scraper',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: '(Example Listing - Not a Real Service) Extracts and normalizes wallet, token, and contract activity across chains.',
    capabilities: ['Token transfer indexing', 'Contract event parsing', 'CSV/JSON exports'],
    completedJobs: 8,
    rating: 4.7,
  },
  {
    id: 'list_3',
    agentName: 'ML Model Fine-Tuner',
    service: 'ML Model Fine-Tuner',
    price: '0.05',
    currency: 'ETH',
    workerAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    endpoint: 'https://agent.example/ml-finetuner',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: '(Example Listing - Not a Real Service) Tunes model checkpoints with reproducible prompts and eval artifacts.',
    capabilities: ['Dataset prep', 'Hyperparameter tuning', 'Eval summary reports'],
    completedJobs: 2,
    rating: 5,
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
    description: '(Example Listing - Not a Real Service) Performs security-focused contract reviews with exploit scenario mapping.',
    capabilities: ['Static analysis', 'Access-control review', 'Reentrancy checks'],
    completedJobs: 21,
    rating: 4.9,
  },
];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalize(raw: Partial<RegistryListing>): RegistryListing {
  return {
    id: raw.id || `list_${Math.random().toString(36).slice(2, 10)}`,
    agentName: raw.agentName || 'Unnamed Agent',
    service: raw.service || 'General Service',
    price: raw.price || '0.001',
    currency: 'ETH',
    workerAddress:
      (raw.workerAddress as `0x${string}` | undefined) ||
      '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    endpoint: raw.endpoint,
    status: raw.status || 'OPEN',
    createdAt: raw.createdAt || new Date().toISOString(),
    description: raw.description,
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities : [],
    completedJobs:
      Number.isFinite(raw.completedJobs as number) && (raw.completedJobs as number) >= 0
        ? Math.floor(raw.completedJobs as number)
        : 0,
    rating:
      raw.rating === null
        ? null
        : Number.isFinite(raw.rating as number)
        ? Math.max(1, Math.min(5, Number(raw.rating)))
        : null,
  };
}

function isTestListing(listing: RegistryListing) {
  const marker = `${listing.id} ${listing.agentName} ${listing.service}`.toLowerCase();
  return marker.includes('test');
}

export function loadRegistryListings(): RegistryListing[] {
  if (!canUseStorage()) return [...defaultAgents];

  const marker = window.localStorage.getItem(REGISTRY_SEED_MARKER_KEY);
  if (marker !== REGISTRY_SEED_MARKER_VALUE) {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(defaultAgents));
    window.localStorage.setItem(REGISTRY_SEED_MARKER_KEY, REGISTRY_SEED_MARKER_VALUE);
    return [...defaultAgents];
  }

  const raw = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(defaultAgents));
    return [...defaultAgents];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RegistryListing>[];
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(defaultAgents));
      return [...defaultAgents];
    }

    const normalized = parsed.map((item) => normalize(item)).filter((item) => !isTestListing(item));
    const finalListings = normalized.length > 0 ? normalized : [...defaultAgents];
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(finalListings));
    return finalListings;
  } catch {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(defaultAgents));
    return [...defaultAgents];
  }
}

export function saveRegistryListings(listings: RegistryListing[]) {
  if (!canUseStorage()) return;
  const normalized = listings.map((item) => normalize(item)).filter((item) => !isTestListing(item));
  window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(normalized));
}

export function addRegistryListing(
  input: Omit<RegistryListing, 'id' | 'createdAt' | 'status' | 'completedJobs' | 'rating'>
): RegistryListing {
  const listing: RegistryListing = normalize({
    ...input,
    id: `list_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    status: 'OPEN',
    completedJobs: 0,
    rating: null,
    currency: 'ETH',
  });

  const current = loadRegistryListings();
  const next = [listing, ...current];
  saveRegistryListings(next);
  return listing;
}

export function findRegistryListingById(id: string): RegistryListing | null {
  const listings = loadRegistryListings();
  return listings.find((item) => item.id === id) ?? null;
}


