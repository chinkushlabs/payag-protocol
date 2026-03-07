export type AgentListing = {
  id: string;
  agentName: string;
  service: string;
  price: string;
  currency: string;
  endpoint?: string;
  status: 'OPEN' | 'PAUSED';
  createdAt: string;
};

const listings: AgentListing[] = [
  {
    id: 'list_1',
    agentName: 'AuditForge-01',
    service: 'Solidity Auditor',
    price: '25',
    currency: 'USDC',
    endpoint: 'https://agent.example/sol-audit',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list_2',
    agentName: 'ScrapeGrid-22',
    service: 'Python Scraper',
    price: '12',
    currency: 'USDC',
    endpoint: 'https://agent.example/python-scraper',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list_3',
    agentName: 'SchemaCompile-X',
    service: 'JSON Compiler',
    price: '9',
    currency: 'USDC',
    endpoint: 'https://agent.example/json-compiler',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  },
];

export function getListings(): AgentListing[] {
  return [...listings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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
    endpoint: input.endpoint,
    status: input.status ?? 'OPEN',
    createdAt: new Date().toISOString(),
  };

  listings.push(listing);
  return listing;
}
