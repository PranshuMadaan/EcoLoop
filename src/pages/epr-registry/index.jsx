import React from 'react';
import { useEprRegistry } from './useEprRegistry.js';
import { EprHashVerifier } from './EprHashVerifier.jsx';
import { EprCertificateCard } from './EprCertificateCard.jsx';
import { EscrowLiquidationTrail } from './EscrowLiquidationTrail.jsx';
import { RecentMintingsTable } from './RecentMintingsTable.jsx';

/**
 * EprRegistryView - Standalone & Mountable CPCB EPR Compliance Registry View
 */
export function EprRegistryView({ initialHash = '', apiBase = '/api/v1' }) {
  const {
    queryHash,
    setQueryHash,
    verifiedCert,
    recentTokens,
    loading,
    error,
    copied,
    verifyHash,
    fetchRecentTokens,
    copyToClipboard,
  } = useEprRegistry(apiBase, initialHash);

  // Sample verified hashes from seeds
  const sampleHashes = [
    { label: 'PET-2026', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { label: 'HDPE-BALES', hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Page Title & Mission */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold mb-2">
          <span>🏛️</span>
          <span>CPCB & MoEFCC Statutory Node</span>
        </div>
        <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
          National EPR Compliance Registry & Audit Ledger
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
          Cryptographically verify Extended Producer Responsibility (EPR) recycling certificates minted through atomic Escrow transactions. Prevent double-counting and verify authentic circular chain-of-custody.
        </p>
      </div>

      {/* Hash Verifier Search Bar */}
      <EprHashVerifier
        queryHash={queryHash}
        onQueryChange={setQueryHash}
        onVerify={verifyHash}
        loading={loading}
        sampleHashes={sampleHashes}
      />

      {/* Verified Certificate View */}
      {(verifiedCert || error) && (
        <div className="space-y-4">
          <EprCertificateCard
            cert={verifiedCert}
            error={error}
            onCopyHash={copyToClipboard}
            copied={copied}
          />
          {verifiedCert?.payout_audit && (
            <EscrowLiquidationTrail audit={verifiedCert.payout_audit} />
          )}
        </div>
      )}

      {/* Recent Ledger Mintings Table */}
      <RecentMintingsTable
        tokens={recentTokens}
        onSelectHash={(hash) => {
          setQueryHash(hash);
          verifyHash(hash);
        }}
        onRefresh={fetchRecentTokens}
        loading={loading}
      />
    </div>
  );
}

export default EprRegistryView;
export { useEprRegistry };
