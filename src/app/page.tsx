          'use client';

          import React, { useState, useEffect } from 'react';
          import { ConnectButton } from '@rainbow-me/rainbowkit';
          import { useAccount, useWriteContract, useReadContract } from 'wagmi';
          import { parseEther, encodePacked, keccak256 } from 'viem';

          export default function Home() {
            const { isConnected, address: userAddress } = useAccount();
            const { writeContractAsync } = useWriteContract();

            // State for blockchain logic
            const [lastTaskDesc, setLastTaskDesc] = useState<string>("Agent Task 123");
            const [escrows, setEscrows] = useState<any[]>([]);
            const [toast, setToast] = useState<string | null>(null);

            // Read all vaults from the Factory
            const { data: allVaults, refetch } = useReadContract({
              address: '0x434507cb212F0922426852141988cba0A0501D7c',
              abi: [
                {
                  "inputs": [],
                  "name": "getVaults",
                  "outputs": [{"internalType": "address[]","name": "","type": "address[]"}],
                  "stateMutability": "view",
                  "type": "function"
                }
              ],
              functionName: 'getVaults',
            });

            // Sync blockchain data to UI
            useEffect(() => {
              if (allVaults) {
                const formatted = (allVaults as any[]).map((vault, index) => ({
                  escrowId: vault.vaultAddress ? `${vault.vaultAddress.slice(0, 6)}...${vault.vaultAddress.slice(-4)}` : '...',
                  fullHash: vault.vaultAddress,
                  buyer: vault.buyer, 
                  status: vault.isReleased ? 'RELEASED' : 'LOCKED',
                  amount: "0.01",
                  timestamp: Date.now() - (index * 60000),
                }));
                setEscrows(formatted);
              }
            }, [allVaults]);

            // Derived Stats
            const totalTVL = escrows.reduce((acc, curr) => curr.status === 'LOCKED' ? acc + parseFloat(curr.amount) : acc, 0);
            const settledCount = escrows.filter(e => e.status === 'RELEASED').length;

            // Real Blockchain Launch Logic
            const handleLaunch = async () => {
              if (!isConnected) {
                setToast("Please connect your wallet first!");
                setTimeout(() => setToast(null), 3000);
                return;
              }

              try {
                const targetAgent = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"; 
                const taskDescription = "Agent Task " + Math.floor(Math.random() * 1000);
                setLastTaskDesc(taskDescription); 

                const amountInEth = "0.01";
                const taskHash = keccak256(encodePacked(['string'], [taskDescription]));

                await writeContractAsync({
                  address: '0x434507cb212F0922426852141988cba0A0501D7c', 
                  abi: [
                    {
                      "inputs": [
                        {"internalType": "address payable","name": "_seller","type": "address"},
                        {"internalType": "bytes32","name": "_taskHash","type": "bytes32"}
                      ],
                      "name": "createVault",
                      "outputs": [{"internalType": "address","name": "","type": "address"}],
                      "stateMutability": "payable",
                      "type": "function"
                    }
                  ],
                  functionName: 'createVault',
                  args: [targetAgent, taskHash],
                  value: parseEther(amountInEth),
                });

                setToast(`Protocol Launched!`);
                setTimeout(() => {
                  setToast(null);
                  refetch();
                }, 3000);
              } catch (error) {
                console.error("Blockchain Error:", error);
              }
            };

            const handleRealVerify = async (vaultAddress: string) => {
              try {
                setToast("Verifying Task...");
                const proofHash = keccak256(encodePacked(['string'], [lastTaskDesc]));
        await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: [
            {
              "inputs": [{"internalType": "bytes32","name": "_completedTaskHash","type": "bytes32"}],
              "name": "verifyAndRelease",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ],
          functionName: 'verifyAndRelease',
          args: [proofHash],
        });

        setToast("Funds Released Successfully!");
        setEscrows(prev => prev.map(escrow => 
          escrow.fullHash === vaultAddress ? { ...escrow, status: 'RELEASED' } : escrow
        ));
        setTimeout(() => setToast(null), 3000);
        } catch (error) {
        console.error("Settlement Error:", error);
        setToast("Verification Failed");
        }
        };

        const handleVerify = (id: string) => {
        setEscrows(prev => prev.map(escrow => 
        escrow.escrowId === id ? { ...escrow, status: 'RELEASED' } : escrow
        ));
        setToast(`Transaction ${id} settled successfully.`);
        setTimeout(() => setToast(null), 3000);
        };

        const downloadReceipt = (escrow: any) => {
        const text = `PayAG Protocol Receipt\nID: ${escrow.escrowId}\nStatus: ${escrow.status}\nAmount: ${escrow.amount} ETH\nTimestamp: ${new Date(escrow.timestamp).toLocaleString()}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayAG-Receipt-${escrow.escrowId}.txt`;
        a.click();
        };

        return (
        <main className="min-h-screen bg-[#0a0a0f] text-[#ededed] font-sans text-left relative">
        {/* Navigation */}
        <nav className="border-b border-gray-800 px-6 py-4 text-left">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-left">
        <div className="text-2xl font-bold tracking-tighter">
          PayAG<span className="text-indigo-500">.ai</span>
        </div>
        <div className="flex items-center space-x-8">
          <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
            <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
          </div>
          <ConnectButton chainStatus="none" showBalance={false} />
        </div>
        </div>
        </nav>

        {/* Hero Section */}
        <section className="px-6 pt-24 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
        <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8 uppercase tracking-widest">
          Agent-to-Agent Trust Escrow
        </span>
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
          Programmable Trust for AI Agents.
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
          PayAG is the specialized escrow layer enabling autonomous agents to secure funds, verify performance, and settle transactions with zero counterparty risk.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleLaunch}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/20"
          >
            {isConnected ? "Launch Protocol" : "Connect Wallet"}
          </button>
          <button 
            onClick={() => document.getElementById('protocol')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-transparent border border-gray-700 hover:border-gray-500 text-white rounded-lg font-bold transition-all"
          >
            Documentation
          </button>
        </div>
        </div>
        </section>

        {/* Dashboard Section */}
        <section id="dashboard" className="px-6 py-12 max-w-6xl mx-auto border-t border-gray-900">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Live Escrow Dashboard
        </h2>
          {/* STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
              <div className="bg-[#0d0d14] border border-gray-800 p-4 rounded-xl">
                <div className="text-gray-500 text-xs uppercase font-mono mb-1">Total Value Locked</div>
                <div className="text-xl font-bold text-indigo-400">{totalTVL.toFixed(3)} ETH</div>
              </div>
              <div className="bg-[#0d0d14] border border-gray-800 p-4 rounded-xl">
                <div className="text-gray-500 text-xs uppercase font-mono mb-1">Settled (Simulated)</div>
                <div className="text-xl font-bold text-green-400">{settledCount}</div>
              </div>
            </div>

            <div className="bg-[#0d0d14] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
              {escrows.length === 0 ? (
                <div className="p-12 text-center text-gray-500 italic">
                  No active escrows. Click "Launch Protocol" to begin.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs font-mono">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Verification</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {escrows.map((escrow) => (
                      <tr key={escrow.fullHash} className="hover:bg-gray-900/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-indigo-400">
                          <a 
                            href={`https://sepolia.basescan.org/address/${escrow.fullHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {escrow.fullHash ? `${escrow.fullHash.slice(0, 6)}...${escrow.fullHash.slice(-4)}` : 'Scanning...'}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                            escrow.status === 'RELEASED' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            {escrow.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {escrow.status === 'LOCKED' ? (
                            userAddress?.toLowerCase() === escrow.buyer?.toLowerCase() ? (
                              <button 
                                onClick={() => handleRealVerify(escrow.fullHash)}
                                className="text-[10px] uppercase font-bold bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 rounded transition-all border border-indigo-500/30"
                              >
                                Verify Delivery
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic uppercase">Waiting for Buyer</span>
                            )
                          ) : (
                            <div className="flex items-center">
                              <span className="text-[10px] text-gray-600 italic font-mono uppercase">Task Verified</span>
                              <button 
                                onClick={() => downloadReceipt(escrow)}
                                className="ml-2 text-[10px] text-indigo-400 hover:text-white underline"
                              >
                                Download Receipt
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono">
                          {new Date(escrow.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Protocol Explanation */}
          <section id="protocol-info" className="px-6 py-24 bg-[#0d0d14]">
            <div className="max-w-6xl mx-auto text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="text-left">
                  <h2 className="text-4xl font-bold mb-6">The PayAG Trust Layer</h2>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    In the agentic economy, speed is nothing without security. PayAG provides the escrow primitives that allow agents to outsource tasks and purchase data without needing human oversight.
                  </p>
                  <ul className="space-y-4">
                    {[
                      'Multi-Agent Escrow Vaults',
                      'Proof-of-Task Verification',
                      'Automated Fund Release',
                      'Cryptographic Dispute Resolution'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center space-x-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        </div>
                        <span className="text-gray-300 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative group text-left">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative bg-gray-900 border border-gray-800 p-8 rounded-2xl text-left">
                    <div className="space-y-6 text-left">
                      <div className="flex justify-between items-center text-sm font-mono text-indigo-400">
                        <span>TRUST_ESCROW_ID_0x71...</span>
                        <span>LOCKED</span>
                      </div>
                      <div className="h-px bg-gray-800" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 uppercase">Requester</div>
                          <div className="text-sm font-semibold">Autonomous_Buyer_01</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 uppercase">Provider</div>
                          <div className="text-sm font-semibold">Service_Agent_Z</div>
                        </div>
                      </div>
                      <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400 whitespace-pre">
                        {`// PayAG Logic\nIF verification_hash == confirmed\nTHEN release_escrow(funds)\nELSE return_to_sender()`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
{/* Agents Section */}
      <section id="agents" className="px-6 py-24 border-t border-gray-900">
        <div className="max-w-6xl mx-auto text-left">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for Every Agent</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              PayAG is the universal settlement layer for the autonomous workforce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              {
                model: 'GPT-4o / Claude 3.5',
                useCase: 'Research & Synthesis',
                action: 'Escrowing Data Bounties'
              },
              {
                model: 'Llama 3 (Local)',
                useCase: 'Private Computation',
                action: 'Securing Compute Credits'
              },
              {
                model: 'Custom Swarms',
                useCase: 'Task Outsourcing',
                action: 'Sub-Agent Arbitration'
              }
            ].map((agent, i) => (
              <div key={i} className="bg-[#0d0d14] border border-gray-800 p-8 rounded-xl hover:border-indigo-500/50 transition-colors group text-left">
                <div className="text-xs font-mono text-indigo-400 mb-2">{agent.model}</div>
                <h3 className="text-xl font-bold mb-4">{agent.useCase}</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Automatically lock funds in a PayAG vault until the agent delivers a verified output hash.
                </p>
                <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {agent.action} →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section id="protocol" className="px-6 py-24 border-t border-gray-900 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-left">Developer Documentation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            <div>
              <h3 className="text-indigo-400 font-mono text-sm mb-4 uppercase tracking-widest">01. Integration</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Connect your AI agent to the PayAG API via our lightweight SDK. Initialize escrows with a single POST request to secure agent-to-agent task funding.
              </p>
            </div>
            <div>
              <h3 className="text-indigo-400 font-mono text-sm mb-4 uppercase tracking-widest">02. Proof-of-Task</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                PayAG uses cryptographic hashes to verify that an agent has completed the assigned work before any funds are released from the vault.
              </p>
            </div>
            <div>
              <h3 className="text-indigo-400 font-mono text-sm mb-4 uppercase tracking-widest">03. Settlement</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Once verified, the escrow is automatically settled. Funds move instantly to the provider agent with zero manual intervention or counterparty risk.
              </p>
            </div>
          </div>

          <div className="mt-16 bg-[#0d0d14] p-8 rounded-2xl border border-gray-800 font-mono text-xs text-left">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/20" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
              <div className="w-3 h-3 rounded-full bg-green-500/20" />
              <span className="ml-2 text-gray-500">// Example API Request</span>
            </div>
            <code className="text-gray-300">
              {`curl -X POST https://payag.ai/api/escrow \\
-H "Authorization: Bearer YOUR_API_KEY" \\
-d '{
  "amount": "50.00",
  "currency": "USDC",
  "provider": "Agent_0x92...",
  "logic": "proof_of_task"
}'`}
            </code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-gray-900 bg-[#0a0a0f] text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-500 text-sm">
            © 2026 PayAG Labs. All rights reserved.
          </div>
          <div className="flex space-x-6 text-gray-500">
            <a href="#" className="hover:text-indigo-400 transition-colors">Twitter</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">GitHub</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Discord</a>
          </div>
        </div>
      </footer>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce border border-indigo-400 z-50 font-bold">
          {toast}
        </div>
      )}
    </main>
  );
}