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
  let resetTimeoutId: any = null;

  const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`; // Target Docker backend port or local dev

  // BroadcastChannel for cross-tab synchronization (Dual-monitor setup)
  const channel = typeof window !== 'undefined' ? new BroadcastChannel('goldengym_access_sync') : null;

  if (channel) {
    channel.onmessage = async (event) => {
      if (event.data?.type === 'CHECKIN_EVENT') {
        const data = event.data.data;
        
        // Reset local timer if any
        if (resetTimeoutId) {
          clearTimeout(resetTimeoutId);
          resetTimeoutId = null;
        }

        // Trigger local screen animation matching the broadcasted event
        isScanning.value = true;
        scanStep.value = 'scanning';
        activeResult.value = null;

        // Step 2: Matched transition
        scanStep.value = 'matched';
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Step 3: Reveal Result (Welcome or Denied)
        activeResult.value = data;
        scanStep.value = 'result';
        isScanning.value = false;

        // Schedule local auto-reset timer
        resetTimeoutId = setTimeout(() => {
          resetScannerLocal();
        }, 40000);
      } else if (event.data?.type === 'RESET_EVENT') {
        resetScannerLocal();
      }
    };
  }

  async function triggerSimulatedScan(memberId?: string, forceResult?: string) {
    if (isScanning.value) return;

    // If there is a pending auto-reset timer, clear it because another user is captured
    if (resetTimeoutId) {
      clearTimeout(resetTimeoutId);
      resetTimeoutId = null;
    }

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
      
      // Broadcast this check-in to other tabs
      if (channel) {
        channel.postMessage({ type: 'CHECKIN_EVENT', data });
      }

      // Fetch latest logs
      await fetchLogs();

      // Start 40-second auto-reset timer
      resetTimeoutId = setTimeout(() => {
        resetScanner();
      }, 40000);

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
    resetScannerLocal();
    if (channel) {
      channel.postMessage({ type: 'RESET_EVENT' });
    }
  }

  const memberLogs = ref<any[]>([]);

  async function fetchMemberLogs(memberId: string) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/biometric/logs?memberId=${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        memberLogs.value = await response.json();
      }
    } catch (e) {
      console.error('Failed to fetch member access logs', e);
    }
  }

  function resetScannerLocal() {
    if (resetTimeoutId) {
      clearTimeout(resetTimeoutId);
      resetTimeoutId = null;
    }
    scanStep.value = 'waiting';
    activeResult.value = null;
  }

  const enrolledFingerprints = ref<any[]>([]);

  async function fetchMemberFingerprints(memberId: string) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/biometric/member/${memberId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        enrolledFingerprints.value = await response.json();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveFingerprint(memberId: string, fingerIndex: number, templateData: string) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/biometric/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ memberId, fingerIndex, templateData })
      });
      if (response.ok) {
        await fetchMemberFingerprints(memberId);
        return true;
      } else {
        const txt = await response.text();
        alert(`Error del Servidor [${response.status}]: ${txt}`);
      }
    } catch (e) {
      alert(`Error de Red/Excepción: ${e}`);
    }
    return false;
  }

  async function deleteFingerprint(memberId: string, fingerIndex: number) {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/biometric/enroll/${memberId}/${fingerIndex}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchMemberFingerprints(memberId);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }

  let agentWS: WebSocket | null = null;
  const isAgentConnected = ref(false);

  function connectToAgent() {
    if (typeof window === 'undefined') return;
    
    agentWS = new WebSocket('ws://localhost:9000');
    
    agentWS.onopen = () => {
      isAgentConnected.value = true;
      console.log('Conectado al Agente Biométrico Local');
    };
    
    agentWS.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'scan_match' && data.memberId) {
          triggerSimulatedScan(data.memberId);
        }
      } catch (e) {
        // Ignorar mensajes de enrolamiento
      }
    };
    
    agentWS.onclose = () => {
      isAgentConnected.value = false;
      setTimeout(connectToAgent, 5000);
    };
    
    agentWS.onerror = () => {
      isAgentConnected.value = false;
    };
  }

  function sendSyncToAgent() {
    if (agentWS && agentWS.readyState === WebSocket.OPEN) {
      agentWS.send(JSON.stringify({ action: 'sync' }));
      return true;
    }
    return false;
  }

  connectToAgent();

  return {
    isScanning,
    scanStep,
    activeResult,
    logs,
    memberLogs,
    enrolledFingerprints,
    isAgentConnected,
    triggerSimulatedScan,
    fetchLogs,
    fetchMemberLogs,
    fetchMemberFingerprints,
    saveFingerprint,
    deleteFingerprint,
    sendSyncToAgent,
    resetScanner,
  };
});
