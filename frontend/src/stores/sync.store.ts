import { defineStore } from 'pinia';
import { ref } from 'vue';
import { formatMexicoTime } from '../utils/mexico-time';

export interface SyncEvent {
  id: string;
  message: string;
  timestamp: string;
}

export interface PendingModification {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export const useSyncStore = defineStore('sync', () => {
  const isOnline = ref(navigator.onLine);
  // States: 'synchronized' | 'synchronizing' | 'offline'
  const syncState = ref<'synchronized' | 'synchronizing' | 'offline'>(
    navigator.onLine ? 'synchronized' : 'offline'
  );
  
  const pendingModifications = ref<PendingModification[]>([]);
  const syncEvents = ref<SyncEvent[]>([]);

  function generateId(): string {
    return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
  }

  function loadFromLocalStorage() {
    try {
      const savedPending = localStorage.getItem('gg_pending_modifications');
      if (savedPending) pendingModifications.value = JSON.parse(savedPending);
      
      const savedEvents = localStorage.getItem('gg_sync_events');
      if (savedEvents) {
        syncEvents.value = JSON.parse(savedEvents);
      } else {
        addEvent(isOnline.value ? 'Sistema iniciado en línea' : 'Sistema iniciado sin conexión');
      }
    } catch (e) {
      console.error('Error loading sync store from localStorage', e);
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem('gg_pending_modifications', JSON.stringify(pendingModifications.value));
    localStorage.setItem('gg_sync_events', JSON.stringify(syncEvents.value));
  }

  function addEvent(message: string) {
    const event: SyncEvent = {
      id: generateId(),
      message,
      timestamp: formatMexicoTime(new Date()),
    };
    syncEvents.value.unshift(event);
    if (syncEvents.value.length > 10) {
      syncEvents.value = syncEvents.value.slice(0, 10);
    }
    saveToLocalStorage();
  }

  function registerModification(type: string, description: string) {
    const timestamp = formatMexicoTime(new Date());
    
    if (!isOnline.value) {
      const mod: PendingModification = {
        id: generateId(),
        type,
        description,
        timestamp,
      };
      pendingModifications.value.push(mod);
      addEvent(`Guardado local: ${description}`);
    } else {
      addEvent(`Sincronizado: ${description}`);
    }
    saveToLocalStorage();
  }

  function triggerSync() {
    if (pendingModifications.value.length === 0) {
      syncState.value = 'synchronized';
      return;
    }
    
    syncState.value = 'synchronizing';
    addEvent(`Sincronizando ${pendingModifications.value.length} cambios pendientes...`);
    
    setTimeout(() => {
      const count = pendingModifications.value.length;
      pendingModifications.value = [];
      syncState.value = 'synchronized';
      addEvent(`Éxito: ${count} cambios sincronizados con el servidor`);
      saveToLocalStorage();
    }, 2000);
  }

  function init() {
    loadFromLocalStorage();

    window.addEventListener('online', () => {
      isOnline.value = true;
      addEvent('Conexión de red restablecida');
      triggerSync();
    });

    window.addEventListener('offline', () => {
      isOnline.value = false;
      syncState.value = 'offline';
      addEvent('Conexión de red perdida. Modo offline activo.');
    });
  }

  return {
    isOnline,
    syncState,
    pendingModifications,
    syncEvents,
    init,
    registerModification,
    triggerSync,
  };
});
