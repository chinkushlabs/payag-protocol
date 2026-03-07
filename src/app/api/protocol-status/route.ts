import { NextResponse } from 'next/server';
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
  {
    inputs: [],
    name: 'isSettled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function GET() {
  const fallback = {
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

    if (vaults.length === 0) {
      return NextResponse.json({ status: fallback });
    }

    const states = await Promise.all(
      vaults.map(async (vaultAddress) => {
        let released = false;

        try {
          released = (await client.readContract({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: 'isReleased',
          })) as boolean;
        } catch {
          try {
            released = (await client.readContract({
              address: vaultAddress,
              abi: VAULT_ABI,
              functionName: 'isSettled',
            })) as boolean;
          } catch {
            released = false;
          }
        }

        const balance = await client.getBalance({ address: vaultAddress });
        return { released, balance };
      })
    );

    const releasedVaults = states.filter((s) => s.released).length;
    const lockedVaults = states.length - releasedVaults;
    const tvlEth = states.reduce((sum, s) => sum + Number(formatEther(s.balance)), 0);

    return NextResponse.json({
      status: {
        factoryAddress: FACTORY_ADDRESS,
        totalVaults: states.length,
        lockedVaults,
        releasedVaults,
        tvlEth: tvlEth.toFixed(4),
      },
    });
  } catch {
    return NextResponse.json({ status: fallback });
  }
}
