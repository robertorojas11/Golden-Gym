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
const selectedMethod = ref('ALL');
const selectedPlan = ref('ALL');

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

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

    // 3. Method
    if (selectedMethod.value !== 'ALL') {
      if (!matchMethod(pay.paymentMethodName, selectedMethod.value)) return false;
    }

    // 4. Membership plan
    if (selectedPlan.value !== 'ALL' && pay.planId !== selectedPlan.value) return false;

    return true;
  });
});

const availablePlans = computed(() => {
  const plans = new Map<string, string>();
  for (const payment of payments.value) {
    if (payment.planId) plans.set(payment.planId, payment.planName || 'Sin plan');
  }
  return Array.from(plans, ([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
});

function clearFilters() {
  searchText.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  selectedMethod.value = 'ALL';
  selectedPlan.value = 'ALL';
}

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

import { jsPDF } from 'jspdf';

async function generateReport() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  // Load and Add Logo Image on the left
  try {
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = '/nobg_logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load logo'));
    });
    doc.addImage(logoImg, 'PNG', 14, 12, 18, 18);
  } catch (err) {
    console.warn('Could not load logo image for PDF report:', err);
  }

  // Title & Header info
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(250, 47, 42); // Golden Gym Red
  doc.text('GOLDEN CORPS GYM - REPORTE DE PAGOS', 36, 18);

  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Madero 196, Centro, 76000 Santiago de Querétaro, Qro. • Tel: 446-117-7918', 36, 23);

  const now = new Date().toLocaleString();
  doc.text(`Fecha del Reporte: ${now}`, 36, 28);
  
  let filterStr = `Filtros aplicados: `;
  const filters: string[] = [];
  if (searchText.value) filters.push(`Búsqueda: "${searchText.value}"`);
  if (dateFrom.value) filters.push(`Desde: ${dateFrom.value}`);
  if (dateTo.value) filters.push(`Hasta: ${dateTo.value}`);
  if (selectedMethod.value !== 'ALL') filters.push(`Método: ${selectedMethod.value}`);
  if (selectedPlan.value !== 'ALL') {
    const plan = availablePlans.value.find((item) => item.id === selectedPlan.value);
    filters.push(`Tipo de plan: ${plan?.name || selectedPlan.value}`);
  }
  
  if (filters.length > 0) {
    filterStr += filters.join(' | ');
  } else {
    filterStr += 'Ninguno (Todos los registros)';
  }
  doc.text(filterStr, 36, 33);

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(14, 38, 201, 38);

  // Table Headers
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Ref. Transacción', 14, 44);
  doc.text('Socio', 45, 44);
  doc.text('Método', 105, 44);
  doc.text('Fecha', 135, 44);
  doc.text('Monto', 180, 44, { align: 'right' });
  doc.text('Estatus', 201, 44, { align: 'right' });

  doc.line(14, 47, 201, 47);

  doc.setFont('Helvetica', 'normal');
  let y = 54;
  let totalSum = 0;

  for (const pay of filteredPayments.value) {
    if (y > 260) {
      doc.addPage();
      y = 20;
      doc.setFont('Helvetica', 'bold');
      doc.text('Ref. Transacción', 14, y);
      doc.text('Socio', 45, y);
      doc.text('Método', 105, y);
      doc.text('Fecha', 135, y);
      doc.text('Monto', 180, y, { align: 'right' });
      doc.text('Estatus', 201, y, { align: 'right' });
      doc.line(14, y + 3, 201, y + 3);
      doc.setFont('Helvetica', 'normal');
      y += 9;
    }

    doc.text(pay.referenceNumber || 'N/A', 14, y);
    
    const nameStr = pay.memberName || 'N/A';
    doc.text(nameStr.substring(0, 30), 45, y);

    doc.text(pay.paymentMethodName || 'N/A', 105, y);

    const payDate = pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : 'N/A';
    doc.text(payDate, 135, y);

    const amountMXN = pay.amount / 100;
    if (pay.status === 'PAID') {
      totalSum += amountMXN;
    }
    doc.text(`$${amountMXN.toFixed(2)}`, 180, y, { align: 'right' });
    doc.text(pay.status === 'PAID' ? 'PAGADO' : 'NO PAGADO', 201, y, { align: 'right' });

    y += 7;
  }

  doc.line(14, y, 201, y);
  y += 7;
  doc.setFont('Helvetica', 'bold');
  doc.text(`Total de registros: ${filteredPayments.value.length}`, 14, y);
  doc.text(`Ingreso Total Neto: $${totalSum.toFixed(2)} MXN`, 201, y, { align: 'right' });

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  doc.save(`Reporte_Pagos_${dateStr}.pdf`);
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-neutral-900">Libro Mayor de Pagos</h2>
      <p class="text-xs text-neutral-500 mt-1">Historial de transacciones financieras</p>
    </div>

    <!-- Toolbar de Filtros -->
    <div class="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl shadow-lg space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <!-- Búsqueda por texto -->
        <div class="md:col-span-3 space-y-1.5">
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

        <!-- Tipo de plan Dropdown -->
        <div class="md:col-span-2 space-y-1.5">
          <label class="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Tipo de plan</label>
          <select 
            v-model="selectedPlan"
            class="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FA2F2A]"
          >
            <option value="ALL">Todos</option>
            <option v-for="plan in availablePlans" :key="plan.id" :value="plan.id">{{ plan.name }}</option>
          </select>
        </div>

        <!-- Método Dropdown -->
        <div class="md:col-span-3 space-y-1.5">
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

      <div class="flex justify-end pt-1 space-x-6">
        <button 
          @click="generateReport"
          class="text-xs text-[#10B981] hover:text-[#059669] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer bg-transparent border-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Generar Reporte (PDF)</span>
        </button>
        <button 
          @click="clearFilters"
          class="text-xs text-[#FA2F2A] hover:text-[#d6201b] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer bg-transparent border-0"
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
              <th class="p-3">Tipo de plan</th>
              <th class="p-3">Método</th>
              <th class="p-3">Fecha de Cobro</th>
              <th class="p-3">Procesado por</th>
              <th class="p-3">Monto</th>
              <th class="p-3 text-right">Estatus</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pay in filteredPayments" :key="pay.id" class="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
              <td class="p-3 font-mono font-semibold text-neutral-700">{{ pay.referenceNumber }}</td>
              <td class="p-3 font-bold text-white">
                {{ pay.memberName }}
                <span class="block text-[10px] text-neutral-400 font-mono font-normal mt-0.5">{{ pay.memberNumber }}</span>
              </td>
              <td class="p-3 text-neutral-600 font-medium">{{ pay.planName || 'Sin plan' }}</td>
              <td class="p-3 text-neutral-600 font-medium">{{ pay.paymentMethodName }}</td>
              <td class="p-3 text-neutral-500">{{ new Date(pay.paymentDate).toLocaleString() }}</td>
              <td class="p-3 text-neutral-600 font-medium">{{ pay.processedByName || 'Sistema' }}</td>
              <td class="p-3 font-bold text-neutral-900">${{ pay.amount / 100 }} MXN</td>
              <td class="p-3 text-right">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="pay.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'"
                >
                  {{ pay.status === 'PAID' ? 'PAGADO' : 'NO PAGADO' }}
                </span>
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
