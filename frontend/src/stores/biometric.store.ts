import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ScanResult {
  memberId: string | null;
  memberName: string | null;
  memberNumber: string | null;
  photoUrl: string | null;
  membershipType: string | null;
  membershipEndDate: string | null;
  matched: boolean;
  confidence: number;
  accessGranted: boolean;
  failureReason?: string;
}

export const useBiometricStore = defineStore('biometric', () => {
  const isScanning = ref(false);
  const scanStep = ref<'waiting' | 'scanning' | 'matched' | 'result'>('waiting');
  const activeResult = ref<ScanResult | null>(null);
  const logs = ref<any[]>([]);

  const API_URL = 'http://localhost:3000'; // Target Docker backend port or local dev

  async function triggerSimulatedScan(memberId?: string, forceResult?: string) {
    if (isScanning.value) return;

    isScanning.value = true;
    scanStep.value = 'scanning';
    activeResult.value = null;

    try {
      const response = await fetch(`${API_URL}/biometric/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, forceResult }),
      });
      
      const data = await response.json();
      
      // Step 2: "Fingerprint matched"
      scanStep.value = 'matched';
      
      // Simulate visual match transition delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 3: Reveal Result (Welcome or Denied)
      activeResult.value = data;
      scanStep.value = 'result';
      
      // Fetch latest logs
      await fetchLogs();
    } catch (error) {
      console.error('Scan simulation error:', error);
      scanStep.value = 'waiting';
    } finally {
      isScanning.value = false;
    }
  }

  async function fetchLogs() {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/biometric/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        logs.value = await response.json();
      }
    } catch (e) {
      console.error('Failed to fetch access logs', e);
    }
  }

  function resetScanner() {
    scanStep.value = 'waiting';
    activeResult.value = null;
  }

  return {
    isScanning,
    scanStep,
    activeResult,
    logs,
    triggerSimulatedScan,
    fetchLogs,
    resetScanner,
  };
});
