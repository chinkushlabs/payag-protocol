import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
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

const VAULT_RELEASE_ABI = [
  {
    inputs: [],
    name: 'isReleased',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isSettled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'completedMilestones',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'milestonesCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function GET() {
  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const vaults = (await client.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getVaults',
    })) as `0x${string}`[];

    const latestVaults = vaults.slice(-10).reverse();

    const jobs = await Promise.all(
      latestVaults.map(async (vaultAddress) => {
        let released = false;
        let completedMilestones = 0;
        let milestonesCount = 1;

        try {
          released = (await client.readContract({
            address: vaultAddress,
            abi: VAULT_RELEASE_ABI,
            functionName: 'isReleased',
          })) as boolean;
        } catch {
          try {
            released = (await client.readContract({
              address: vaultAddress,
              abi: VAULT_RELEASE_ABI,
              functionName: 'isSettled',
            })) as boolean;
          } catch {
            released = false;
          }
        }

        try {
          const [completedRaw, totalRaw] = (await Promise.all([
            client.readContract({
              address: vaultAddress,
              abi: VAULT_RELEASE_ABI,
              functionName: 'completedMilestones',
            }),
            client.readContract({
              address: vaultAddress,
              abi: VAULT_RELEASE_ABI,
              functionName: 'milestonesCount',
            }),
          ])) as [bigint, bigint];

          completedMilestones = Number(completedRaw);
          milestonesCount = Number(totalRaw);
        } catch {
          completedMilestones = released ? 1 : 0;
          milestonesCount = 1;
        }

        return {
          vaultAddress,
          status: released ? 'SETTLED' : 'ACTIVE',
          completedMilestones,
          milestonesCount,
          explorerUrl: `https://sepolia.basescan.org/address/${vaultAddress}`,
        };
      })
    );

    return NextResponse.json({ jobs, totalVaults: vaults.length, factory: FACTORY_ADDRESS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load live vaults' },
      { status: 500 }
    );
  }
}
