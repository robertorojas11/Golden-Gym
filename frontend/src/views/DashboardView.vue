<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useMemberStore } from '../stores/member.store';

const router = useRouter();
const authStore = useAuthStore();
const memberStore = useMemberStore();

const summary = ref({
  activeMembers: 0,
  expiringMemberships: 0,
  expiredMemberships: 0,
  todayAccesses: 0,
  monthlyRevenue: 0,
  newMembersThisMonth: 0,
});

const charts = ref({
  dailyAccesses: [] as any[],
  monthlyRevenue: [] as any[],
  distribution: [] as any[],
});

const recent = ref({
  recentAccesses: [] as any[],
  recentPayments: [] as any[],
  upcomingExpirations: [] as any[],
});

const API_URL = 'http://localhost:3000';

async function fetchDashboardData() {
  const token = authStore.token;
  try {
    const summaryRes = await fetch(`${API_URL}/analytics/summary`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (summaryRes.ok) summary.value = await summaryRes.json();

    const chartsRes = await fetch(`${API_URL}/analytics/charts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (chartsRes.ok) charts.value = await chartsRes.json();

    const recentRes = await fetch(`${API_URL}/analytics/recent`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (recentRes.ok) recent.value = await recentRes.json();
  } catch (error) {
    console.error('Error al cargar datos del dashboard', error);
  }
}

onMounted(() => {
  fetchDashboardData();
  memberStore.fetchMembers();
  memberStore.fetchPlans();
});

// Modal states
const showAddMember = ref(false);
const showAssignPlan = ref(false);
const showRegisterPayment = ref(false);

// Add member form model
const memberForm = ref({
  firstName: '',
  lastName: '',
  gender: 'Masculino',
  birthDate: '',
  email: '',
  phone: '',
  street: '',
  number: '',
  city: '',
  state: '',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  notes: '',
});

async function saveMember() {
  const payload = {
    ...memberForm.value,
    notes: memberForm.value.notes ? [memberForm.value.notes] : [],
  };
  const created = await memberStore.createMember(payload);
  if (created) {
    showAddMember.value = false;
    // Reset form
    memberForm.value = {
      firstName: '',
      lastName: '',
      gender: 'Masculino',
      birthDate: '',
      email: '',
      phone: '',
      street: '',
      number: '',
      city: '',
      state: '',
      postalCode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      notes: '',
    };
    fetchDashboardData();
  }
}

// Assign Plan models
const assignForm = ref({
  memberId: '',
  planId: '',
});

async function submitAssignPlan() {
  const created = await memberStore.assignMembership(assignForm.value.memberId, assignForm.value.planId);
  if (created) {
    showAssignPlan.value = false;
    fetchDashboardData();
  }
}

// Register Payment models
const paymentForm = ref({
  memberId: '',
  membershipId: '',
  paymentMethodId: '90000000-0000-0000-0000-000000000001', // Cash/Efectivo
  amount: 0,
  referenceNumber: '',
});

const memberMemberships = ref<any[]>([]);

async function onPaymentMemberChange() {
  if (!paymentForm.value.memberId) return;
  const token = authStore.token;
  const res = await fetch(`${API_URL}/memberships/member/${paymentForm.value.memberId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (res.ok) {
    memberMemberships.value = await res.json();
    if (memberMemberships.value.length > 0) {
      paymentForm.value.membershipId = memberMemberships.value[0].id;
      const plan = memberStore.plans.find((p) => p.id === memberMemberships.value[0].planId);
      if (plan) {
        paymentForm.value.amount = plan.price / 100;
      }
    }
  }
}

async function submitRegisterPayment() {
  const payload = {
    ...paymentForm.value,
    amount: paymentForm.value.amount * 100, // a centavos
  };
  const success = await memberStore.registerPayment(payload);
  if (success) {
    showRegisterPayment.value = false;
    paymentForm.value = {
      memberId: '',
      membershipId: '',
      paymentMethodId: '90000000-0000-0000-0000-000000000001',
      amount: 0,
      referenceNumber: '',
    };
    fetchDashboardData();
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-8">
    
    <!-- Top Greeting & Quick Action Buttons -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-neutral-900">Consola de Recepción Central</h2>
        <p class="text-xs text-neutral-500 mt-1">Hola, {{ authStore.user?.firstName }} • Conectado a la base de datos local</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button 
          @click="showAddMember = true"
          class="bg-black hover:bg-neutral-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          + Registrar Miembro
        </button>
        <button 
          @click="showAssignPlan = true"
          class="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          Asignar Plan
        </button>
        <button 
          @click="showRegisterPayment = true"
          class="bg-[#FA2F2A] hover:bg-[#d6201b] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          $ Registrar Pago
        </button>
      </div>
    </div>

    <!-- Widgets Section -->
    <div class="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <div class="premium-card p-4 bg-white">
        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Miembros Activos</p>
        <p class="text-2xl font-bold text-neutral-900 mt-2">{{ summary.activeMembers }}</p>
      </div>

      <div class="premium-card p-4 bg-white">
        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Por Vencer (7d)</p>
        <p class="text-2xl font-bold text-[#FFA624] mt-2">{{ summary.expiringMemberships }}</p>
      </div>

      <div class="premium-card p-4 bg-white">
        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Planes Vencidos</p>
        <p class="text-2xl font-bold text-red-500 mt-2">{{ summary.expiredMemberships }}</p>
      </div>

      <div class="premium-card p-4 bg-white">
        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Accesos de Hoy</p>
        <p class="text-2xl font-bold text-emerald-500 mt-2">{{ summary.todayAccesses }}</p>
      </div>

      <div class="premium-card p-4 bg-white col-span-2 md:col-span-1">
        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Ingreso Mensual</p>
        <p class="text-2xl font-bold text-neutral-900 mt-2">${{ summary.monthlyRevenue }} MXN</p>
      </div>

      <div class="premium-card p-4 bg-white">
        <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Nuevos Registros</p>
        <p class="text-2xl font-bold text-neutral-900 mt-2">{{ summary.newMembersThisMonth }}</p>
      </div>
    </div>

    <!-- Charts Grid (SVG Based) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Chart 1: Accesses per Day -->
      <div class="premium-card p-6 bg-white">
        <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-6">Tránsito Diario (Entradas)</h3>
        <div class="h-44 flex items-end justify-between px-2 pt-2 border-b border-neutral-100">
          <div 
            v-for="item in charts.dailyAccesses" 
            :key="item.date" 
            class="flex flex-col items-center space-y-2 flex-grow mx-2"
          >
            <div class="text-[10px] font-semibold text-neutral-400">{{ item.count }}</div>
            <div 
              class="w-full bg-neutral-900 rounded-t"
              :style="{ height: `${(item.count / 35) * 120}px` }"
            ></div>
            <div class="text-[10px] font-medium text-neutral-500 pt-1">{{ item.date }}</div>
          </div>
        </div>
      </div>

      <!-- Chart 2: Monthly Revenue -->
      <div class="premium-card p-6 bg-white">
        <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-6">Ingreso Mensual (MXN)</h3>
        <div class="h-44 flex items-end justify-between px-2 pt-2 border-b border-neutral-100">
          <div 
            v-for="item in charts.monthlyRevenue" 
            :key="item.month" 
            class="flex flex-col items-center space-y-2 flex-grow mx-2"
          >
            <div class="text-[10px] font-semibold text-neutral-400">${{ item.amount }}</div>
            <div 
              class="w-full bg-[#FA2F2A] rounded-t"
              :style="{ height: `${(item.amount / 35000) * 120}px` }"
            ></div>
            <div class="text-[10px] font-medium text-neutral-500 pt-1">{{ item.month }}</div>
          </div>
        </div>
      </div>

      <!-- Chart 3: Membership Status distribution -->
      <div class="premium-card p-6 bg-white flex flex-col justify-between">
        <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Distribución de Membresías</h3>
        
        <div class="space-y-4 flex-grow flex flex-col justify-center">
          <div v-for="item in charts.distribution" :key="item.name" class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="font-medium text-neutral-700">{{ item.name }}</span>
              <span class="font-bold text-neutral-900">{{ item.value }} membresías</span>
            </div>
            <div class="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full"
                :class="{
                  'bg-emerald-500': item.name === 'Activa',
                  'bg-amber-400': item.name === 'Pendiente',
                  'bg-red-500': item.name === 'Expirada',
                  'bg-neutral-400': item.name === 'Cancelada',
                }"
                :style="{ width: `${item.value ? (item.value / 3) * 100 : 0}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Data Tables Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Table 1: Recent Check-ins -->
      <div class="premium-card p-6 bg-white overflow-hidden flex flex-col justify-between min-h-[280px]">
        <div>
          <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Accesos Recientes</h3>
          <div class="space-y-4">
            <div v-for="log in recent.recentAccesses" :key="log.id" class="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
              <div class="flex items-center space-x-3">
                <img :src="log.photoUrl || ''" alt="Foto Miembro" class="w-8 h-8 rounded-full border bg-neutral-100 object-cover" />
                <div>
                  <p class="text-xs font-bold text-neutral-800">{{ log.memberName }}</p>
                  <p class="text-[10px] text-neutral-400">
                    {{ log.membershipType }} • {{ new Date(log.scannedAt).toLocaleString() }}
                  </p>
                </div>
              </div>
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-semibold"
                :class="log.accessGranted ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'"
              >
                {{ log.accessGranted ? 'PERMITIDO' : 'RECHAZADO' }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-900 flex justify-end">
          <router-link to="/access-control" class="text-xs text-[#FA2F2A] hover:text-[#d6201b] font-bold uppercase tracking-wider transition-colors flex items-center space-x-1">
            <span>Ver todo</span>
            <span>→</span>
          </router-link>
        </div>
      </div>

      <!-- Table 2: Upcoming Expirations -->
      <div class="premium-card p-6 bg-white overflow-hidden flex flex-col justify-between min-h-[280px]">
        <div>
          <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Próximos Vencimientos</h3>
          <div class="space-y-4">
            <div v-for="ms in recent.upcomingExpirations" :key="ms.id" class="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
              <div>
                <p class="text-xs font-bold text-neutral-800">{{ ms.memberName }}</p>
                <p class="text-[10px] text-neutral-400">{{ ms.planName }}</p>
              </div>
              <span class="text-[11px] font-semibold text-[#FFA624]">
                Vence: {{ ms.endDate }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-900 flex justify-end">
          <router-link to="/members" class="text-xs text-[#FA2F2A] hover:text-[#d6201b] font-bold uppercase tracking-wider transition-colors flex items-center space-x-1">
            <span>Ver todo</span>
            <span>→</span>
          </router-link>
        </div>
      </div>

      <!-- Table 3: Recent Payments -->
      <div class="premium-card p-6 bg-white overflow-hidden flex flex-col justify-between min-h-[280px]">
        <div>
          <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Cobros Recientes</h3>
          <div class="space-y-4">
            <div v-for="pay in recent.recentPayments" :key="pay.id" class="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
              <div>
                <p class="text-xs font-bold text-neutral-800">{{ pay.memberName }}</p>
                <p class="text-[10px] text-neutral-400">{{ pay.method }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-neutral-900">${{ pay.amount }} MXN</p>
                <p class="text-[9px] font-semibold text-emerald-600 uppercase">{{ pay.status === 'PAID' ? 'PAGADO' : 'REEMBOLSADO' }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-900 flex justify-end">
          <router-link to="/payments" class="text-xs text-[#FA2F2A] hover:text-[#d6201b] font-bold uppercase tracking-wider transition-colors flex items-center space-x-1">
            <span>Ver todo</span>
            <span>→</span>
          </router-link>
        </div>
      </div>

    </div>

    <!-- MODAL 1: REGISTER MEMBER -->
    <div v-if="showAddMember" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative">
        <h3 class="text-lg font-bold text-neutral-900 mb-6">Registrar Nuevo Miembro</h3>
        
        <form @submit.prevent="saveMember" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Nombre</label>
              <input v-model="memberForm.firstName" type="text" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-neutral-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Apellidos</label>
              <input v-model="memberForm.lastName" type="text" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-neutral-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Género</label>
              <select v-model="memberForm.gender" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-neutral-800">
                <option>Masculino</option>
                <option>Femenino</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Fecha de Nacimiento</label>
              <input v-model="memberForm.birthDate" type="date" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-neutral-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Correo Electrónico</label>
              <input v-model="memberForm.email" type="email" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-neutral-800" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Número de Teléfono</label>
              <input v-model="memberForm.phone" type="tel" required class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-neutral-800" />
            </div>
          </div>

          <hr class="border-neutral-100" />

          <h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Información de Dirección</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Calle</label>
              <input v-model="memberForm.street" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Número</label>
              <input v-model="memberForm.number" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Ciudad</label>
              <input v-model="memberForm.city" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Estado</label>
              <input v-model="memberForm.state" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Código Postal</label>
              <input v-model="memberForm.postalCode" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <hr class="border-neutral-100" />

          <h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Contacto de Emergencia</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Nombre del Contacto</label>
              <input v-model="memberForm.emergencyContactName" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Teléfono de Contacto</label>
              <input v-model="memberForm.emergencyContactPhone" type="tel" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Parentesco / Relación</label>
              <input v-model="memberForm.emergencyContactRelationship" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <hr class="border-neutral-100" />

          <div>
            <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Observaciones</label>
            <textarea v-model="memberForm.notes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Detalles de salud, preferencias de entrenamiento, etc."></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <button @click="showAddMember = false" type="button" class="px-4 py-2 border rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-neutral-900">Guardar Perfil</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: ASSIGN PLAN -->
    <div v-if="showAssignPlan" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        <h3 class="text-base font-bold text-neutral-900 mb-6">Asignar Plan de Membresía</h3>
        
        <form @submit.prevent="submitAssignPlan" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Seleccionar Miembro</label>
            <select v-model="assignForm.memberId" required class="w-full border rounded-lg px-3 py-2 text-sm">
              <option v-for="m in memberStore.members" :key="m.id" :value="m.id">{{ m.firstName }} {{ m.lastName }} ({{ m.memberNumber }})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Seleccionar Plan</label>
            <select v-model="assignForm.planId" required class="w-full border rounded-lg px-3 py-2 text-sm">
              <option v-for="p in memberStore.plans" :key="p.id" :value="p.id">{{ p.name }} - ${{ p.price / 100 }} MXN ({{ p.durationDays }} días)</option>
            </select>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <button @click="showAssignPlan = false" type="button" class="px-4 py-2 border rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-neutral-900">Asignar Plan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: REGISTER PAYMENT -->
    <div v-if="showRegisterPayment" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        <h3 class="text-base font-bold text-neutral-900 mb-6">Registrar Recibo de Pago</h3>
        
        <form @submit.prevent="submitRegisterPayment" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Seleccionar Miembro</label>
            <select v-model="paymentForm.memberId" @change="onPaymentMemberChange" required class="w-full border rounded-lg px-3 py-2 text-sm">
              <option v-for="m in memberStore.members" :key="m.id" :value="m.id">{{ m.firstName }} {{ m.lastName }} ({{ m.memberNumber }})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Membresía Pendiente por Pagar</label>
            <select v-model="paymentForm.membershipId" required class="w-full border rounded-lg px-3 py-2 text-sm">
              <option v-for="m in memberMemberships" :key="m.id" :value="m.id">{{ m.planName }} ({{ m.startDate }} al {{ m.endDate }}) [{{ m.status }}]</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Método de Pago</label>
            <select v-model="paymentForm.paymentMethodId" required class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="90000000-0000-0000-0000-000000000001">Efectivo</option>
              <option value="90000000-0000-0000-0000-000000000002">Tarjeta de Débito</option>
              <option value="90000000-0000-0000-0000-000000000003">Tarjeta de Crédito</option>
              <option value="90000000-0000-0000-0000-000000000004">Transferencia</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Monto (MXN)</label>
              <input v-model="paymentForm.amount" type="number" required class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-neutral-500 uppercase mb-2">Nº Referencia (Opcional)</label>
              <input v-model="paymentForm.referenceNumber" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej: TX-18827" />
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
            <button @click="showRegisterPayment = false" type="button" class="px-4 py-2 border rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-neutral-900">Confirmar Pago</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
