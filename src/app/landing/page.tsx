import Link from 'next/link';
import LandingWalletButton from './LandingWalletButton';
import { createPublicClient, formatEther, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined) ??
  '0x4c3825FA6DDfd2eaCE6fa9191de3fb3c204bAc3c';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

const FACTORY_ABI = [
  {
    inputs: [],
    name: 'getVaults',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const VAULT_ABI = [
  {
    inputs: [],
    name: 'isReleased',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

type ProtocolStatus = {
  factoryAddress: `0x${string}`;
  totalVaults: number;
  lockedVaults: number;
  releasedVaults: number;
  tvlEth: string;
};

async function getProtocolStatus(): Promise<ProtocolStatus> {
  const fallback: ProtocolStatus = {
    factoryAddress: FACTORY_ADDRESS,
    totalVaults: 0,
    lockedVaults: 0,
    releasedVaults: 0,
    tvlEth: '0.0000',
  };

  try {
    const client = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

    const vaults = (await client.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getVaults',
    })) as `0x${string}`[];

    if (vaults.length === 0) return fallback;

    const states = await Promise.all(
      vaults.map(async (vaultAddress) => {
        const [released, balance] = await Promise.all([
          client.readContract({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: 'isReleased',
          }) as Promise<boolean>,
          client.getBalance({ address: vaultAddress }),
        ]);

        return { released, balance };
      })
    );

    const releasedVaults = states.filter((s) => s.released).length;
    const lockedVaults = states.length - releasedVaults;
    const tvlEth = states.reduce((sum, s) => sum + Number(formatEther(s.balance)), 0);

    return {
      factoryAddress: FACTORY_ADDRESS,
      totalVaults: states.length,
      lockedVaults,
      releasedVaults,
      tvlEth: tvlEth.toFixed(4),
    };
  } catch {
    return fallback;
  }
}

export default async function LandingPage() {
  const status = await getProtocolStatus();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#ededed] font-sans">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <header className="mb-14 grid gap-8 md:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-2xl font-bold tracking-tighter">
                Pay<span className="text-indigo-500">AG</span>
              </div>
              <div className="flex items-center gap-3">
                <LandingWalletButton />
                <Link
                  href="/dashboard"
                  className="rounded-md border border-gray-700 px-3 py-2 text-xs uppercase tracking-[0.16em] text-gray-300 hover:border-gray-500 hover:text-white"
                >
                  Agent Login
                </Link>
              </div>
            </div>
            <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
              Escrow Infrastructure
              <br />
              for Autonomous Workflows
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
              PayAG secures B2B agent operations with deterministic Proof-of-Task verification,
              milestone releases, and programmable settlement guarantees.
            </p>
          </div>

          <aside className="rounded-2xl border border-gray-800 bg-[#0d0d14] p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
              Protocol Status
            </h2>
            <dl className="grid grid-cols-2 gap-y-4 text-sm">
              <dt className="text-gray-500">Factory</dt>
              <dd className="truncate text-right font-mono text-gray-200">{status.factoryAddress}</dd>

              <dt className="text-gray-500">Vaults</dt>
              <dd className="text-right text-gray-200">{status.totalVaults}</dd>

              <dt className="text-gray-500">Locked</dt>
              <dd className="text-right text-gray-200">{status.lockedVaults}</dd>

              <dt className="text-gray-500">Released</dt>
              <dd className="text-right text-gray-200">{status.releasedVaults}</dd>

              <dt className="text-gray-500">TVL</dt>
              <dd className="text-right text-indigo-400">{status.tvlEth} ETH</dd>
            </dl>
          </aside>
        </header>

        <section id="developers" className="mb-16 rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Developers</h2>
          <p className="mb-8 max-w-3xl text-gray-400">
            Integrate PayAG by funding a vault, producing a deterministic proof hash, then
            triggering verification through the server-side route. Proof-of-Task secures funds via
            a cryptographic handshake: the contract computes keccak256(proofString) and releases
            only when it matches the milestone proof hash.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <article>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                createVault
              </h3>
              <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black p-4 text-xs text-gray-300">
{`await writeContractAsync({
  address: FACTORY_ADDRESS,
  abi: FACTORY_ABI,
  functionName: 'createVault',
  args: [workerAddress, taskHash],
  value: parseEther('0.01'),
});`}
              </pre>
            </article>

            <article>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                generateProofHash
              </h3>
              <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black p-4 text-xs text-gray-300">
{`import { generateProofHash } from '@/lib/payagProof';

const proof = 'file:sha256:...';
const taskHash = generateProofHash(proof);`}
              </pre>
            </article>

            <article>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
                /api/verify
              </h3>
              <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black p-4 text-xs text-gray-300">
{`await fetch('/api/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vaultAddress,
    proofString,
    milestoneIndex: 0,
  }),
});`}
              </pre>
            </article>
          </div>
        </section>

        <section id="use-cases" className="rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">Use Cases</h2>
          <h3 className="mb-3 text-lg font-medium text-white">Digital Service Provisioning</h3>
          <p className="mb-6 max-w-3xl text-gray-400">
            Client and provider coordinate through deterministic proofs. Payment is unlocked only
            when the provider supplies cryptographic evidence matching the agreed milestone.
          </p>

          <ol className="grid gap-3 text-sm text-gray-300 md:grid-cols-4">
            <li className="rounded-lg border border-gray-800 bg-black p-4">1. Client locks funds in PayAG vault</li>
            <li className="rounded-lg border border-gray-800 bg-black p-4">2. Provider completes deliverable or API output</li>
            <li className="rounded-lg border border-gray-800 bg-black p-4">3. Deterministic proof hash is submitted</li>
            <li className="rounded-lg border border-gray-800 bg-black p-4">4. Matching proof releases payment automatically</li>
          </ol>

          <div className="mt-6 rounded-xl border border-gray-800 bg-black p-5 text-sm text-gray-300">
            Total protection against non-payment for creators, guaranteed delivery assurances for
            buyers, and no subjective arbitration at settlement time.
          </div>
        </section>
      </div>
    </main>
  );
}


