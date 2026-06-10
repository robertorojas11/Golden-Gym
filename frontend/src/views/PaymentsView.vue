<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useSyncStore } from '../stores/sync.store';

const authStore = useAuthStore();
const syncStore = useSyncStore();
const payments = ref<any[]>([]);

// Filter states
const searchText = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const selectedStatus = ref('ALL');
const selectedMethod = ref('ALL');

const API_URL = 'http://localhost:3000';

async function fetchPayments() {
  const token = authStore.token;
  try {
    const res = await fetch(`${API_URL}/payments`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      payments.value = await res.json();
    }
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  fetchPayments();
});

function matchMethod(payMethodName: string, selected: string): boolean {
  if (selected === 'ALL') return true;
  const name = payMethodName.toLowerCase();
  if (selected === 'efectivo') {
    return name.includes('efectivo') || name.includes('cash');
  }
  if (selected === 'credito') {
    return name.includes('crédito') || name.includes('credit');
  }
  if (selected === 'debito') {
    return name.includes('débito') || name.includes('debit');
  }
  if (selected === 'transferencia') {
    return name.includes('transferencia') || name.includes('transfer');
  }
  return false;
}

const filteredPayments = computed(() => {
  return payments.value.filter((pay) => {
    // 1. Text Search
    if (searchText.value) {
      const query = searchText.value.toLowerCase();
      const memberName = (pay.memberName || '').toLowerCase();
      const refNum = (pay.referenceNumber || '').toLowerCase();
      if (!memberName.includes(query) && !refNum.includes(query)) {
        return false;
      }
    }

    // 2. Date Range
    if (dateFrom.value) {
      const fromTime = new Date(dateFrom.value + 'T00:00:00').getTime();
      const payTime = new Date(pay.paymentDate).getTime();
      if (payTime < fromTime) return false;
    }
    if (dateTo.value) {
      const toTime = new Date(dateTo.value + 'T23:59:59').getTime();
      const payTime = new Date(pay.paymentDate).getTime();
      if (payTime > toTime) return false;
    }

    // 3. Status
    if (selectedStatus.value !== 'ALL') {
      if (pay.status !== selectedStatus.value) return false;
    }

    // 4. Method
    if (selectedMethod.value !== 'ALL') {
      if (!matchMethod(pay.paymentMethodName, selectedMethod.value)) return false;
    }

    return true;
  });
});

function clearFilters() {
  searchText.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  selectedStatus.value = 'ALL';
  selectedMethod.value = 'ALL';
}

// Modal state
const showRefundModal = ref(false);
const refundingPaymentId = ref<string | null>(null);
const refundingPaymentRef = ref<string | null>(null);
const isRefunding = ref(false);

const confirmBtnRef = ref<HTMLElement | null>(null);
const cancelBtnRef = ref<HTMLElement | null>(null);

// Success toast state
const toastMessage = ref('');
const showToast = ref(false);

function triggerToast(message: string) {
  toastMessage.value = message;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
}

function openRefundModal(id: string, reference: string) {
  refundingPaymentId.value = id;
  refundingPaymentRef.value = reference;
  showRefundModal.value = true;
}

function closeRefundModal() {
  showRefundModal.value = false;
  refundingPaymentId.value = null;
  refundingPaymentRef.value = null;
}

watch(showRefundModal, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', handleModalKeys);
    setTimeout(() => {
      cancelBtnRef.value?.focus();
    }, 50);
  } else {
    window.removeEventListener('keydown', handleModalKeys);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleModalKeys);
});

function handleModalKeys(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeRefundModal();
  }
  if (e.key === 'Tab') {
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      if (activeEl === cancelBtnRef.value) {
        confirmBtnRef.value?.focus();
        e.preventDefault();
      }
    } else {
      if (activeEl === confirmBtnRef.value) {
        cancelBtnRef.value?.focus();
        e.preventDefault();
      }
    }
  }
}

async function confirmRefund() {
  if (!refundingPaymentId.value) return;
  isRefunding.value = true;
  try {
    const token = authStore.token;
    const res = await fetch(`${API_URL}/payments/${refundingPaymentId.value}/refund`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      triggerToast(`Reembolso del pago ${refundingPaymentRef.value} procesado correctamente.`);
      syncStore.registerModification('REEMBOLSO_PAGO', `Reembolso de pago ref: ${refundingPaymentRef.value}`);
      closeRefundModal();
      fetchPayments();
    } else {
      const err = await res.json();
      triggerToast(err.message || 'Error al procesar el reembolso.');
    }
  } catch (error) {
    console.error(error);
    triggerToast('Ocurrió un error inesperado.');
  } finally {
    isRefunding.value = false;
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-neutral-900">Libro Mayor de Pagos</h2>
      <p class="text-xs text-neutral-500 mt-1">Historial de transacciones financieras y reembolsos</p>
    </div>

    <!-- Toolbar de Filtros -->
    <div class="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl shadow-lg space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <!-- Búsqueda por texto -->
        <div class="md:col-span-4 space-y-1.5">
          <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Buscar</label>
          <input 
            v-model="searchText"
            type="text"
            placeholder="Miembro o Nº Ref (REF-XXXXXXX)..."
            class="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FA2F2A]"
          />
        </div>

        <!-- Rango de fecha Desde -->
        <div class="md:col-span-2 space-y-1.5">
          <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Desde</label>
          <input 
            v-model="dateFrom"
            type="date"
            class="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FA2F2A]"
          />
        </div>

        <!-- Rango de fecha Hasta -->
        <div class="md:col-span-2 space-y-1.5">
          <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Hasta</label>
          <input 
            v-model="dateTo"
            type="date"
            class="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FA2F2A]"
          />
        </div>

        <!-- Estatus Dropdown -->
        <div class="md:col-span-2 space-y-1.5">
          <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Estatus</label>
          <select 
            v-model="selectedStatus"
            class="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FA2F2A]"
          >
            <option value="ALL">Todos</option>
            <option value="PAID">Pagado</option>
            <option value="REFUNDED">Reembolsado</option>
          </select>
        </div>

        <!-- Método Dropdown -->
        <div class="md:col-span-2 space-y-1.5">
          <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Método</label>
          <select 
            v-model="selectedMethod"
            class="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FA2F2A]"
          >
            <option value="ALL">Todos</option>
            <option value="efectivo">Efectivo</option>
            <option value="credito">Tarjeta de Crédito</option>
            <option value="debito">Tarjeta de Débito</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>
      </div>

      <div class="flex justify-end pt-1">
        <button 
          @click="clearFilters"
          class="text-xs text-[#FA2F2A] hover:text-[#d6201b] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Limpiar filtros</span>
        </button>
      </div>
    </div>

    <div class="premium-card bg-white p-6 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-100">
              <th class="p-3">Ref. Transacción</th>
              <th class="p-3">Miembro</th>
              <th class="p-3">Método</th>
              <th class="p-3">Fecha de Cobro</th>
              <th class="p-3">Procesado por</th>
              <th class="p-3">Monto</th>
              <th class="p-3 text-right">Estatus</th>
              <th v-if="authStore.hasPermission('manage:payments')" class="p-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pay in filteredPayments" :key="pay.id" class="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
              <td class="p-3 font-mono font-semibold text-neutral-700">{{ pay.referenceNumber }}</td>
              <td class="p-3 font-bold text-white">
                {{ pay.memberName }}
                <span class="block text-[10px] text-neutral-400 font-mono font-normal mt-0.5">{{ pay.memberNumber }}</span>
              </td>
              <td class="p-3 text-neutral-600 font-medium">{{ pay.paymentMethodName }}</td>
              <td class="p-3 text-neutral-500">{{ new Date(pay.paymentDate).toLocaleString() }}</td>
              <td class="p-3 text-neutral-600 font-medium">{{ pay.processedByName || 'Sistema' }}</td>
              <td class="p-3 font-bold text-neutral-900">${{ pay.amount / 100 }} MXN</td>
              <td class="p-3 text-right">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="pay.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'"
                >
                  {{ pay.status === 'PAID' ? 'PAGADO' : 'REEMBOLSADO' }}
                </span>
              </td>
              <td v-if="authStore.hasPermission('manage:payments')" class="p-3 text-right">
                <button 
                  v-if="pay.status === 'PAID'"
                  @click="openRefundModal(pay.id, pay.referenceNumber)"
                  class="bg-neutral-100 hover:bg-red-50 hover:text-red-600 text-neutral-600 px-3 py-1 rounded text-[10px] font-bold transition-all border border-neutral-200"
                >
                  Reembolsar
                </button>
                <span v-else class="text-[10px] text-neutral-400 font-medium italic">N/A</span>
              </td>
            </tr>
            <tr v-if="filteredPayments.length === 0">
              <td colspan="8" class="p-12 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                  <h4 class="text-sm font-bold text-neutral-300">No se encontraron transacciones con los filtros seleccionados.</h4>
                  <button 
                    @click="clearFilters"
                    class="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN DE REEMBOLSO -->
    <div 
      v-if="showRefundModal" 
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-dialog-title"
    >
      <div class="bg-neutral-950 border border-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div class="space-y-2 text-center md:text-left">
          <h3 id="refund-dialog-title" class="text-base font-bold text-white uppercase tracking-widest flex items-center justify-center md:justify-start space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Procesar Reembolso</span>
          </h3>
          <p class="text-sm text-neutral-200 pt-2">
            ¿Estás seguro de que deseas reembolsar la transacción <strong class="text-white font-mono font-bold">{{ refundingPaymentRef }}</strong>?
          </p>
          <p class="text-xs text-neutral-400">
            Esta acción es destructiva y cancelará la membresía del miembro asociado de inmediato.
          </p>
        </div>

        <div class="flex space-x-3 pt-4 border-t border-neutral-900">
          <button 
            ref="cancelBtnRef"
            type="button" 
            @click="closeRefundModal"
            class="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 py-2.5 rounded-xl font-bold transition-all border border-neutral-800 text-xs"
          >
            Cancelar
          </button>
          <button 
            ref="confirmBtnRef"
            type="button"
            @click="confirmRefund"
            :disabled="isRefunding"
            class="flex-1 bg-red-650 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs disabled:opacity-55"
          >
            {{ isRefunding ? 'Procesando...' : 'Confirmar Reembolso' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST NOTIFICACIÓN -->
    <div 
      v-if="showToast" 
      class="fixed bottom-6 right-6 bg-[#FA2F2A] border border-red-500/30 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 font-mono text-xs"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ toastMessage }}</span>
    </div>

  </div>
</template>
