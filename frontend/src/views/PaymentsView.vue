<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth.store';

const authStore = useAuthStore();
const payments = ref<any[]>([]);

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

    <div class="premium-card bg-white p-6 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-100">
              <th class="p-3">Ref. Transacción</th>
              <th class="p-3">Método</th>
              <th class="p-3">Fecha de Cobro</th>
              <th class="p-3">Procesado por</th>
              <th class="p-3">Monto</th>
              <th class="p-3 text-right">Estatus</th>
              <th v-if="authStore.hasPermission('manage:payments')" class="p-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pay in payments" :key="pay.id" class="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
              <td class="p-3 font-mono font-semibold text-neutral-700">{{ pay.referenceNumber }}</td>
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
            <tr v-if="payments.length === 0">
              <td colspan="7" class="p-4 text-center text-neutral-400">No existen registros de pago en la base de datos.</td>
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
