import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api.js';

/**
 * useWorkerLedger Hook
 * Self-contained state hook for Informal Waste Worker Digital Ledger & Kiosk
 * Powered by shared Axios client (withCredentials: true)
 */
export function useWorkerLedger(apiBase = '/api/v1', defaultWorkerId = '77777777-7777-7777-7777-777777777701') {
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(defaultWorkerId);
  const [workerData, setWorkerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [activeLanguage, setActiveLanguage] = useState('hi');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('Tap microphone to simulate voice note (e.g. "25 kilo PET plastic")');

  // Fetch all worker profiles for selector
  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api.get('/workers');
      const data = res.data;
      if (data.success) {
        setWorkers(data.data || []);
      }
    } catch (err) {
      console.warn('Could not load workers list:', err.message);
    }
  }, []);

  // Fetch full ledger details for selected worker
  const fetchWorkerLedger = useCallback(async (workerId) => {
    const id = workerId || selectedWorkerId;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/iwl/worker/${id}/ledger`);
      const data = res.data;
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      setWorkerData(data.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch worker ledger');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkerId]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    fetchWorkerLedger(selectedWorkerId);
  }, [selectedWorkerId, fetchWorkerLedger]);

  // Submit standard weigh-in
  const logWeighIn = async (weighInData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/workers/weigh-ins', {
        worker_id: selectedWorkerId,
        ...weighInData,
      });
      const data = res.data;
      
      // If auto-paid or receipt generated, display receipt modal
      if (data.data?.payout_receipt) {
        setReceiptModalData(data.data.payout_receipt);
      } else if (data.data) {
        setReceiptModalData({
          worker_name: workerData?.worker?.full_name || 'Verified Recycler',
          material_grade: weighInData.material_grade,
          net_weight_kg: weighInData.net_weight_kg,
          rate_per_kg: weighInData.rate_per_kg,
          amount_inr: weighInData.total_payout_inr || (weighInData.net_weight_kg * weighInData.rate_per_kg),
          utr_number: data.data.utr_number || `2610${Math.floor(10000000 + Math.random() * 90000000)}`,
          seller_upi_vpa: workerData?.worker?.upi_vpa || 'worker@upi',
          processed_at: new Date().toISOString(),
          dwcc_hub_name: weighInData.dwcc_hub_name || 'Bengaluru Central DWCC Hub',
        });
      }
      await fetchWorkerLedger(selectedWorkerId);
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.message || 'Failed to log weigh-in';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // Trigger instant spot payout for pending weigh-in
  const triggerPayout = async (weighInId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/workers/weigh-ins/${weighInId}/payout`, {});
      const data = res.data;
      setReceiptModalData(data.data?.payout_receipt || data.data);
      await fetchWorkerLedger(selectedWorkerId);
      return { success: true, data: data.data };
    } catch (err) {
      const msg = err.message || 'Payout failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // Simulate WhatsApp regional voice note parsing
  const simulateVoiceNote = async (transcriptText = '25 kilo PET plastic') => {
    setIsRecording(true);
    setVoiceFeedback(`🎙️ Listening in ${activeLanguage.toUpperCase()}...`);
    
    // Simulate network audio processing delay
    setTimeout(() => {
      setIsRecording(false);
      setVoiceFeedback(`✓ Parsed: "${transcriptText}" → 25.0 kg PET (Est: ₹550.00)`);
    }, 1200);
  };

  return {
    workers,
    selectedWorkerId,
    setSelectedWorkerId,
    workerData,
    loading,
    error,
    receiptModalData,
    setReceiptModalData,
    activeLanguage,
    setActiveLanguage,
    isRecording,
    voiceFeedback,
    logWeighIn,
    triggerPayout,
    simulateVoiceNote,
    fetchWorkerLedger,
  };
}

export default useWorkerLedger;
