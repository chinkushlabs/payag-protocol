import { NextResponse } from 'next/server';
import { isAddress, isHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  createWorkerPublicClient,
  createWorkerWalletClient,
  submitProofToChain,
  submitRefundToChain,
} from '@/lib/payagWorkerAgent';
import {
  getPendingSubmissions,
  getSubmissionById,
  markSubmissionFailed,
  markSubmissionRefunded,
  markSubmissionReleased,
} from '@/lib/arbiterQueueDb';
import {
  addJobActivity,
  getJobByVault,
  resolveJobAsRefunded,
  resolveJobAsReleased,
  updateJobStatus,
} from '@/lib/jobsStore';

const TREASURY_WALLET = '0x82343e2fed61fca6d2ead64689ff406e29fea7c8' as const;
const PROTOCOL_FEE_BPS = 350;
const BPS_DENOMINATOR = 10000;

const VAULT_READ_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'milestoneIndex', type: 'uint256' }],
    name: 'getMilestone',
    outputs: [
      { internalType: 'bytes32', name: 'proofHash', type: 'bytes32' },
      { internalType: 'uint256', name: 'payoutAmount', type: 'uint256' },
      { internalType: 'bool', name: 'released', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function GET() {
  const submissions = await getPendingSubmissions();

  const pending = await Promise.all(submissions.map(async (submission) => {
    const job = await getJobByVault(submission.vaultAddress);
    return {
      ...submission,
      buyer: job?.buyer ?? null,
      workerAddress: job?.workerAddress ?? null,
      service: job?.service ?? null,
      activityLog: job?.activityLog ?? [],
      jobStatus: job?.status ?? null,
      dispute: job?.dispute ?? null,
      buyerTaskHash: submission.buyerTaskHash ?? job?.taskHash ?? null,
    };
  }));

  return NextResponse.json({ engine: 'db-v3', pending });

}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const submissionId = String(body?.submissionId ?? '').trim();
    const action = String(body?.action ?? 'RELEASE').trim().toUpperCase();

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission || (submission.status !== 'AWAITING_ARBITER_RELEASE' && submission.status !== 'DISPUTED')) {
      return NextResponse.json({ error: 'Pending submission not found' }, { status: 404 });
    }

    const privateKey = process.env.WORKER_PRIVATE_KEY;
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

    if (!privateKey || !isHex(privateKey)) {
      return NextResponse.json(
        { error: 'WORKER_PRIVATE_KEY is missing or invalid' },
        { status: 500 }
      );
    }

    if (!isAddress(TREASURY_WALLET)) {
      return NextResponse.json({ error: 'Treasury wallet misconfigured' }, { status: 500 });
    }

    const walletClient = createWorkerWalletClient({
      privateKey,
      rpcUrl,
      chain: baseSepolia,
    });

    const publicClient = createWorkerPublicClient({ rpcUrl, chain: baseSepolia });

    if (action === 'REFUND') {
      const note = String(body?.note ?? 'Dispute accepted by arbiter').trim();

      try {
        const txHash = await submitRefundToChain({
          walletClient,
          vaultAddress: submission.vaultAddress,
          milestoneIndex: submission.milestoneIndex,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        await markSubmissionRefunded({ id: submission.id, refundTxHash: txHash });
        await updateJobStatus(submission.vaultAddress, 'REFUNDED');
        await resolveJobAsRefunded({
          vaultAddress: submission.vaultAddress,
          note,
          refundTxHash: txHash,
        });
        await addJobActivity(submission.vaultAddress, {
          actor: 'ARBITER',
          message: `Arbiter approved dispute and refunded buyer. Tx: ${txHash}`,
        });

        return NextResponse.json({
          status: receipt.status,
          action: 'REFUND',
          submissionId: submission.id,
          vaultAddress: submission.vaultAddress,
          txHash,
          note,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Arbiter refund failed';
        await markSubmissionFailed({ id: submission.id, error: message });
        await addJobActivity(submission.vaultAddress, {
          actor: 'ARBITER',
          message: `Arbiter refund failed: ${message}`,
        });
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const milestone = (await publicClient.readContract({
      address: submission.vaultAddress,
      abi: VAULT_READ_ABI,
      functionName: 'getMilestone',
      args: [BigInt(submission.milestoneIndex)],
    })) as readonly [`0x${string}`, bigint, boolean];

    const grossPayoutWei = milestone[1];
    const protocolFeeWei = (grossPayoutWei * BigInt(PROTOCOL_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
    const workerPayoutWei = grossPayoutWei - protocolFeeWei;

    try {
      const txHash = await submitProofToChain({
        walletClient,
        vaultAddress: submission.vaultAddress,
        milestoneIndex: submission.milestoneIndex,
        proofString: submission.proofString,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      await markSubmissionReleased({ id: submission.id, txHash });
      await updateJobStatus(submission.vaultAddress, 'SETTLED');
      await resolveJobAsReleased({
        vaultAddress: submission.vaultAddress,
        note: 'Arbiter approved release',
      });
      await addJobActivity(submission.vaultAddress, {
        actor: 'ARBITER',
        message: `Arbiter approved proof and released payout. Tx: ${txHash}`,
      });

      return NextResponse.json({
        status: receipt.status,
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        milestoneIndex: submission.milestoneIndex,
        protocolFeeBps: PROTOCOL_FEE_BPS,
        treasuryWallet: TREASURY_WALLET,
        grossPayoutWei: grossPayoutWei.toString(),
        protocolFeeWei: protocolFeeWei.toString(),
        workerPayoutWei: workerPayoutWei.toString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arbiter release failed';
      await markSubmissionFailed({ id: submission.id, error: message });
      await addJobActivity(submission.vaultAddress, {
        actor: 'ARBITER',
        message: `Arbiter release failed: ${message}`,
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin verify failed' },
      { status: 500 }
    );
  }
}


