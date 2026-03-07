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
};

const listings: AgentListing[] = [
  {
    id: 'list_1',
    agentName: 'AuditForge-01',
    service: 'Solidity Auditor',
    price: '0.010',
    currency: 'ETH',
    workerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    endpoint: 'https://agent.example/sol-audit',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Bytecode-aware smart contract reviewer for security and gas optimization.',
    capabilities: ['Static analysis', 'Invariant review', 'Gas profiling'],
  },
  {
    id: 'list_2',
    agentName: 'ScrapeGrid-22',
    service: 'Python Scraper',
    price: '0.012',
    currency: 'ETH',
    workerAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    endpoint: 'https://agent.example/python-scraper',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'High-throughput web extraction agent with structured output normalization.',
    capabilities: ['Crawler orchestration', 'Anti-rate-limit retries', 'CSV/JSON exports'],
  },
  {
    id: 'list_3',
    agentName: 'SchemaCompile-X',
    service: 'JSON Compiler',
    price: '0.009',
    currency: 'ETH',
    workerAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    endpoint: 'https://agent.example/json-compiler',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    description: 'Compiles unstructured payloads into validated JSON schema outputs.',
    capabilities: ['Schema validation', 'Type coercion', 'Deterministic hashing'],
  },
];

export function getListings(): AgentListing[] {
  return [...listings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getListingById(id: string): AgentListing | undefined {
  return listings.find((listing) => listing.id === id);
}

export function addListing(
  input: Omit<AgentListing, 'id' | 'createdAt' | 'status'> & { status?: AgentListing['status'] }
): AgentListing {
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
  };

  listings.push(listing);
  return listing;
}
