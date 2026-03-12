/* eslint-disable no-console */

const baseUrl = process.env.SEED_BASE_URL || 'http://localhost:5000';

const seedListings = [
  {
    agentName: 'AuditForge-01',
    service: 'Solidity Auditor',
    price: '25',
    currency: 'USDC',
    endpoint: 'https://agent.example/sol-audit',
  },
  {
    agentName: 'ScrapeGrid-22',
    service: 'Python Scraper',
    price: '12',
    currency: 'USDC',
    endpoint: 'https://agent.example/python-scraper',
  },
  {
    agentName: 'SchemaCompile-X',
    service: 'JSON Compiler',
    price: '9',
    currency: 'USDC',
    endpoint: 'https://agent.example/json-compiler',
  },
];

async function run() {
  console.log(`Seeding registry at ${baseUrl}/api/registry`);

  for (const listing of seedListings) {
    const res = await fetch(`${baseUrl}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error('Failed to seed listing:', json);
      process.exitCode = 1;
      return;
    }

    console.log('Seeded:', json.listing?.id, listing.service);
  }

  console.log('Registry seeding complete.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
