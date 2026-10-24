import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api.js';

/**
 * useMarketplace Hook
 * Self-contained state hook for B2B Scrap Marketplace using shared Axios client
 */
export function useMarketplace(apiBase = '/api/v1') {
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterMaterial, setFilterMaterial] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [activeBidListing, setActiveBidListing] = useState(null);
  const [settlementReceipt, setSettlementReceipt] = useState(null);

  // Fetch all active listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterMaterial === 'ALL'
        ? '/listings'
        : `/listings?material_grade=${filterMaterial}`;
      const res = await api.get(url);
      const data = res.data;
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      setListings(data.data || []);

      // Auto-select first listing if none selected
      if (!selectedListing && data.data && data.data.length > 0) {
        setSelectedListing(data.data[0]);
      } else if (selectedListing) {
        // Update selected listing details
        const updated = (data.data || []).find((l) => l.listing_id === selectedListing.listing_id);
        if (updated) setSelectedListing(updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch scrap listings');
    } finally {
      setLoading(false);
    }
  }, [filterMaterial, selectedListing]);

  useEffect(() => {
    fetchListings();
  }, [filterMaterial]);

  // Place a new recycler bid
  const placeBid = async (listingId, bidAmountPerKg, bidderOrg = 'GreenTech Recyclers Pvt Ltd') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/listings/${listingId}/bids`, {
        bid_amount_per_kg: Number(bidAmountPerKg),
        bidder_organization: bidderOrg,
      });
      const data = res.data;
      await fetchListings();
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.message || 'Failed to submit bid';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // Create a new aggregated scrap lot
  const createListing = async (listingData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/listings', listingData);
      const data = res.data;
      setIsCreateModalOpen(false);
      await fetchListings();
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.message || 'Failed to create scrap listing';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // Accept highest bid and trigger Escrow settlement
  const acceptWinningBid = async (listingId, winningBidId) => {
    setLoading(true);
    setError(null);
    try {
      // Backend route handles accept-bid
      const res = await api.post(`/listings/${listingId}/accept-bid`, {
        bid_id: winningBidId,
      });
      const data = res.data;
      setSettlementReceipt(data.data);
      await fetchListings();
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.message || 'Failed to accept bid';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  return {
    listings,
    selectedListing,
    setSelectedListing,
    loading,
    error,
    filterMaterial,
    setFilterMaterial,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isEscrowModalOpen,
    setIsEscrowModalOpen,
    activeBidListing,
    setActiveBidListing,
    settlementReceipt,
    setSettlementReceipt,
    fetchListings,
    placeBid,
    createListing,
    acceptWinningBid,
  };
}

export default useMarketplace;
