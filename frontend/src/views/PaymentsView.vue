<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

async function handleRefund(id: string) {
  const ok = confirm('¿Estás seguro de que deseas reembolsar este pago? Esto cancelará la membresía del miembro de inmediato.');
  if (ok) {
    const token = authStore.token;
    const res = await fetch(`${API_URL}/payments/${id}/refund`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      alert('Reembolso procesado correctamente.');
      fetchPayments();
    } else {
      const err = await res.json();
      alert(err.message || 'Error al procesar el reembolso.');
    }
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
                  @click="handleRefund(pay.id)"
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
  </div>
</template>
