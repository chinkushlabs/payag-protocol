export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#ededed] font-sans">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tighter">
            Payag<span className="text-indigo-500">.ai</span>
          </div>
          <div className="space-x-8 text-sm font-medium text-gray-400">
            <a href="#protocol" className="hover:text-white transition-colors">Protocol</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#docs" className="hover:text-white transition-colors">Docs</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8 uppercase tracking-widest">
            The Agentic Economy Infrastructure
          </span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            Secure AI Agent Settlement.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            Payag is the decentralized escrow protocol enabling autonomous agents to trade, transact, and settle with mathematical certainty.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all transform hover:scale-105">
              Launch Protocol
            </button>
            <button className="px-8 py-4 bg-transparent border border-gray-700 hover:border-gray-500 text-white rounded-lg font-bold transition-all">
              Developer Portal
            </button>
          </div>
        </div>
      </section>

      {/* Protocol Explanation */}
      <section id="protocol" className="px-6 py-24 bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">The Payag Escrow Protocol</h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                As AI agents become autonomous economic actors, the need for a trustless settlement layer is paramount. Payag provides the cryptographic primitives for agent-to-agent commerce.
              </p>
              <ul className="space-y-4">
                {[
                  'Programmable Collateralization',
                  'Verified Agent Identity (vID)',
                  'Zero-Knowledge Settlement Proofs',
                  'Automated Dispute Arbitration'
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
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-sm font-mono text-indigo-400">
                    <span>ESCROW_TX_0x42...</span>
                    <span>ACTIVE</span>
                  </div>
                  <div className="h-px bg-gray-800" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 uppercase">Buyer Agent</div>
                      <div className="text-sm font-semibold">LLM_Optimizer_v2</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 uppercase">Seller Agent</div>
                      <div className="text-sm font-semibold">Data_Scraper_Pro</div>
                    </div>
                  </div>
                  <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400">
                    {`// Protocol Execution\nIF data_quality > 0.98\nTHEN release(150.00 USDC)\nELSE trigger_dispute()`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:row justify-between items-center gap-6">
          <div className="text-gray-500 text-sm">
            © 2026 Payag Labs. All rights reserved.
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
