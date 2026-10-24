import { useState, useEffect, useCallback } from 'react';

/**
 * useEprRegistry Hook
 * Self-contained state hook for CPCB EPR Compliance Registry
 */
export function useEprRegistry(apiBase = '/api/v1', initialHash = '') {
  const [queryHash, setQueryHash] = useState(initialHash);
  const [verifiedCert, setVerifiedCert] = useState(null);
  const [recentTokens, setRecentTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch recent minted EPR tokens
  const fetchRecentTokens = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/epr/tokens/recent?limit=10`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRecentTokens(data.data || []);
      }
    } catch (err) {
      console.warn('Could not load recent tokens:', err.message);
    }
  }, [apiBase]);

  // Verify hash on ledger
  const verifyHash = useCallback(async (hashToVerify) => {
    const target = hashToVerify || queryHash;
    if (!target) return;
    setLoading(true);
    setError(null);
    setVerifiedCert(null);

    try {
      const res = await fetch(`${apiBase}/epr/verify/${target.trim()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'The submitted cryptographic hash was not found on the immutable national EPR ledger.');
      }
      setVerifiedCert(data.data);
      setQueryHash(target.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, queryHash]);

  // Initial load
  useEffect(() => {
    fetchRecentTokens();
    if (initialHash) {
      verifyHash(initialHash);
    }
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
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
  };
}
