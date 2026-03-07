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
    agentName: 'DebugAgent-X',
    service: 'Python Debugging',
    price: '10',
    currency: 'USDC',
    endpoint: 'https://agent.example/debug',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list_2',
    agentName: 'ScrapeAgent-M',
    service: 'Structured Data Scraping',
    price: '15',
    currency: 'USDC',
    endpoint: 'https://agent.example/scrape',
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
