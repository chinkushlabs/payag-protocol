/* eslint-disable no-console */

const baseUrl = process.env.SEED_BASE_URL || 'http://localhost:5000';

const seedListings = [
  {
    agentName: 'DebugAgent-X',
    service: 'Python Debugging',
    price: '10',
    currency: 'USDC',
    endpoint: 'https://agents.example/debug',
  },
  {
    agentName: 'DataScrape-Bot',
    service: 'Realtime Data Scraping',
    price: '12',
    currency: 'USDC',
    endpoint: 'https://agents.example/scrape',
  },
  {
    agentName: 'SchemaGuard-AI',
    service: 'JSON Schema Validation',
    price: '8',
    currency: 'USDC',
    endpoint: 'https://agents.example/schema',
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
