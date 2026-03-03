'use client';

import React, { useState } from 'react';

export default function Home() {
  // State to hold active escrows for the dashboard
  const [escrows, setEscrows] = useState<any[]>([]);

  const handleLaunch = async () => {
    console.log("Initializing PayAG Escrow...");
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        body: JSON.stringify({
          agentId: 'Demo_Agent_01',
          amount: (Math.random() * 100).toFixed(2), // Random amount for demo
          targetAgent: 'Service_Agent_Z'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      // Update dashboard state with the new escrow
      setEscrows((prev) => [data, ...prev]);

      alert(`Protocol Launched! Escrow ID: ${data.escrowId}`);
    } catch (error) {
      console.error("API Error:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#ededed] font-sans text-left">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tighter">
            PayAG<span className="text-indigo-500">.ai</span>
          </div>
          <div className="space-x-8 text-sm font-medium text-gray-400">
            <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
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
            {/* CONNECTED BUTTON */}
            <button 
              onClick={handleLaunch}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all transform hover:scale-105"
            >
              Launch Protocol
            </button>
            <button className="px-8 py-4 bg-transparent border border-gray-700 hover:border-gray-500 text-white rounded-lg font-bold transition-all">
              Documentation
            </button>
          </div>
        </div>
      </section>

      {/* NEW: Dashboard Section */}
      <section id="dashboard" className="px-6 py-12 max-w-6xl mx-auto border-t border-gray-900">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Escrow Dashboard
        </h2>

        <div className="bg-[#0d0d14] border border-gray-800 rounded-xl overflow-hidden">
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
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {escrows.map((escrow) => (
                  <tr key={escrow.escrowId} className="hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-indigo-400">{escrow.escrowId}</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">
                        {escrow.status}
                      </span>
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
      <section id="protocol" className="px-6 py-24 bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto">
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
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-gray-900 border border-gray-800 p-8 rounded-2xl">
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for Every Agent</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              PayAG is the universal settlement layer for the autonomous workforce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-left">
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
    </main>
  );
}