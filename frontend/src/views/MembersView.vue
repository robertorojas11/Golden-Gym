<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useMemberStore } from '../stores/member.store';
import { useAuthStore } from '../stores/auth.store';

const memberStore = useMemberStore();
const authStore = useAuthStore();
const searchQuery = ref('');
const activeTab = ref<'detail' | 'memberships' | 'payments'>('detail');

onMounted(() => {
  memberStore.fetchMembers();
  memberStore.fetchPlans();
});

function handleSearch() {
  memberStore.fetchMembers(searchQuery.value);
}

function selectMember(id: string) {
  memberStore.fetchMemberDetail(id);
  activeTab.value = 'detail';
}

const noteText = ref('');
async function saveNote() {
  if (!noteText.value || !memberStore.selectedMember) return;
  const token = localStorage.getItem('access_token');
  const res = await fetch(`http://localhost:3000/members/${memberStore.selectedMember.id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ note: noteText.value })
  });
  if (res.ok) {
    noteText.value = '';
    memberStore.fetchMemberDetail(memberStore.selectedMember.id);
  }
}

// Destructive confirmation modal state
const showDeactivateModal = ref(false);
const isDeactivating = ref(false);
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

function openDeactivateModal() {
  showDeactivateModal.value = true;
}

function closeDeactivateModal() {
  showDeactivateModal.value = false;
}

watch(showDeactivateModal, (newVal) => {
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
    closeDeactivateModal();
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

function triggerDeactivate() {
  if (!memberStore.selectedMember) return;
  openDeactivateModal();
}

async function confirmDeactivate() {
  if (!memberStore.selectedMember) return;
  isDeactivating.value = true;
  try {
    const success = await memberStore.deactivateMember(memberStore.selectedMember.id);
    if (success) {
      triggerToast(`Miembro ${memberStore.selectedMember.firstName} desactivado correctamente.`);
      closeDeactivateModal();
    } else {
      triggerToast('Error al desactivar el miembro.');
    }
  } catch (error) {
    console.error(error);
    triggerToast('Ocurrió un error inesperado.');
  } finally {
    isDeactivating.value = false;
  }
}

// Membership Edit Models
const showEditMembershipModal = ref(false);
const editingMembership = ref<any>(null);
const membershipForm = ref({
  planId: '',
  startDate: '',
  endDate: '',
  status: 'PENDING' as 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED',
});

function openEditMembership(ms: any) {
  editingMembership.value = ms;
  membershipForm.value = {
    planId: ms.planId,
    startDate: ms.startDate,
    endDate: ms.endDate,
    status: ms.status,
  };
  showEditMembershipModal.value = true;
}

async function handleSaveMembership() {
  if (!editingMembership.value || !memberStore.selectedMember) return;
  const success = await memberStore.updateMembership(editingMembership.value.id, membershipForm.value);
  if (success) {
    showEditMembershipModal.value = false;
    editingMembership.value = null;
    memberStore.fetchMemberDetail(memberStore.selectedMember.id);
  } else {
    alert('Error al actualizar la membresía');
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- IZQUIERDA: Buscar y Lista (col-span-4) -->
      <div class="lg:col-span-4 space-y-4">
        <div class="premium-card p-4 bg-white space-y-3">
          <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Buscar Miembros</h3>
          <div class="relative">
            <input 
              v-model="searchQuery" 
              @input="handleSearch"
              type="text" 
              placeholder="Nombre, teléfono, Nº de miembro..." 
              class="w-full border rounded-xl pl-3 pr-10 py-2.5 text-xs focus:outline-neutral-900"
            />
            <button @click="handleSearch" class="absolute right-3 top-3 text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="premium-card bg-white p-2 max-h-[600px] overflow-y-auto space-y-1">
          <div 
            v-for="m in memberStore.members" 
            :key="m.id"
            @click="selectMember(m.id)"
            class="px-4 py-3 rounded-xl cursor-pointer hover:bg-neutral-50 flex items-center space-x-3 transition-all"
            :class="memberStore.selectedMember?.id === m.id ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'text-neutral-800'"
          >
            <img :src="m.photoUrl || ''" alt="Miembro" class="w-8 h-8 rounded-full border border-neutral-200 bg-white" />
            <div class="flex-grow">
              <p class="text-xs font-bold">{{ m.firstName }} {{ m.lastName }}</p>
              <p class="text-[10px]" :class="memberStore.selectedMember?.id === m.id ? 'text-neutral-400' : 'text-neutral-400'">{{ m.memberNumber }}</p>
            </div>
            <span class="w-2 h-2 rounded-full" :class="m.isActive ? 'bg-emerald-500' : 'bg-red-500'"></span>
          </div>

          <div v-if="memberStore.members.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-neutral-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p class="text-xs font-bold text-neutral-300">No se encontraron miembros</p>
            <p class="text-[10px] text-neutral-500 mt-1 max-w-[200px]">Prueba con otro término de búsqueda o registra un nuevo miembro.</p>
          </div>
        </div>
      </div>

      <!-- DERECHA: Ficha de detalles (col-span-8) -->
      <div class="lg:col-span-8">
        
        <div v-if="memberStore.selectedMember" class="premium-card bg-white overflow-hidden">
          
          <!-- Banner de Ficha -->
          <div class="h-28 bg-gradient-to-r from-black to-neutral-900 p-6 flex items-end justify-between text-white relative">
            <div class="flex items-center space-x-4">
              <img 
                :src="memberStore.selectedMember.photoUrl || ''" 
                alt="Avatar Miembro" 
                class="w-20 h-20 rounded-xl bg-white border border-neutral-200 shadow object-cover translate-y-10" 
              />
              <div class="space-y-1">
                <h3 class="text-lg font-bold text-[#FFA624]">{{ memberStore.selectedMember.firstName }} {{ memberStore.selectedMember.lastName }}</h3>
                <p class="text-xs text-white">Número de Miembro: {{ memberStore.selectedMember.memberNumber }}</p>
              </div>
            </div>

            <button 
              @click="triggerDeactivate"
              class="bg-red-550 border border-red-200 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              Desactivar Miembro
            </button>
          </div>

          <div class="pt-14 px-6 pb-6">
            
            <!-- Tabs Nav -->
            <div class="flex border-b border-neutral-100 text-xs font-bold text-neutral-400 space-x-6 mb-6">
              <button 
                @click="activeTab = 'detail'"
                class="pb-3 border-b-2"
                :class="activeTab === 'detail' ? 'border-[#FA2F2A] text-neutral-900' : 'border-transparent hover:text-neutral-600'"
              >
                Perfil y Detalles
              </button>
              <button 
                @click="activeTab = 'memberships'"
                class="pb-3 border-b-2"
                :class="activeTab === 'memberships' ? 'border-[#FA2F2A] text-neutral-900' : 'border-transparent hover:text-neutral-600'"
              >
                Historial de Planes
              </button>
              <button 
                @click="activeTab = 'payments'"
                class="pb-3 border-b-2"
                :class="activeTab === 'payments' ? 'border-[#FA2F2A] text-neutral-900' : 'border-transparent hover:text-neutral-600'"
              >
                Recibos de Pago
              </button>
            </div>

            <!-- TAB 1: Perfil y Detalles -->
            <div v-if="activeTab === 'detail'" class="space-y-6 text-xs text-neutral-800">
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Info Personal -->
                <div class="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                  <h4 class="font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Información Personal</h4>
                  <div class="grid grid-cols-2 gap-2 text-neutral-700">
                    <div><span class="text-neutral-400 block">Género</span> {{ memberStore.selectedMember.gender }}</div>
                    <div><span class="text-neutral-400 block">F. Nacimiento</span> {{ memberStore.selectedMember.birthDate }}</div>
                    <div class="col-span-2 pt-2"><span class="text-neutral-400 block">Correo Electrónico</span> {{ memberStore.selectedMember.email || 'No registrado' }}</div>
                    <div class="col-span-2"><span class="text-neutral-400 block">Teléfono</span> {{ memberStore.selectedMember.phone }}</div>
                  </div>
                </div>

                <!-- Dirección -->
                <div class="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                  <h4 class="font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Dirección</h4>
                  <div class="text-neutral-700 space-y-1">
                    <p><span class="text-neutral-400">Calle y Número:</span> {{ memberStore.selectedMember.street }} {{ memberStore.selectedMember.number }}</p>
                    <p><span class="text-neutral-400">Ciudad:</span> {{ memberStore.selectedMember.city }}, {{ memberStore.selectedMember.state }}</p>
                    <p><span class="text-neutral-400">C.P.:</span> {{ memberStore.selectedMember.postalCode }}</p>
                  </div>
                </div>

                <!-- Contacto de Emergencia -->
                <div class="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                  <h4 class="font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Contacto de Emergencia</h4>
                  <div class="text-neutral-700 space-y-1">
                    <p><span class="text-neutral-400">Nombre:</span> {{ memberStore.selectedMember.emergencyContactName || 'N/A' }}</p>
                    <p><span class="text-neutral-400">Teléfono:</span> {{ memberStore.selectedMember.emergencyContactPhone || 'N/A' }}</p>
                    <p><span class="text-neutral-400">Parentesco:</span> {{ memberStore.selectedMember.emergencyContactRelationship || 'N/A' }}</p>
                  </div>
                </div>

                <!-- Info Registro -->
                <div class="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                  <h4 class="font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Registro de Gimnasio</h4>
                  <div class="text-neutral-700 space-y-1">
                    <p><span class="text-neutral-400">Fecha de Registro:</span> {{ memberStore.selectedMember.registrationDate }}</p>
                    <p><span class="text-neutral-400">Nº de Miembro:</span> {{ memberStore.selectedMember.memberNumber }}</p>
                    <p v-if="memberStore.selectedMember.createdByName"><span class="text-neutral-400">Registrado por:</span> {{ memberStore.selectedMember.createdByName }}</p>
                    <p v-if="memberStore.selectedMember.updatedByName"><span class="text-neutral-400">Última edición por:</span> {{ memberStore.selectedMember.updatedByName }}</p>
                  </div>
                </div>
              </div>

              <!-- Notas -->
              <div class="border border-neutral-100 rounded-xl p-4 bg-white space-y-4">
                <h4 class="font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Observaciones del Personal</h4>
                
                <div class="space-y-2">
                  <div v-for="(note, idx) in memberStore.selectedMember.notes" :key="idx" class="p-3 bg-neutral-50 rounded-lg text-xs italic text-neutral-700">
                    "{{ note }}"
                  </div>
                </div>

                <div class="flex space-x-2">
                  <input 
                    v-model="noteText" 
                    type="text" 
                    placeholder="Escribir nota del personal..." 
                    class="flex-grow border rounded-lg px-3 py-2 text-xs focus:outline-neutral-900" 
                  />
                  <button @click="saveNote" class="bg-black text-white hover:bg-neutral-900 px-4 py-2 rounded-lg font-semibold text-xs">
                    Añadir Nota
                  </button>
                </div>
              </div>

            </div>

            <!-- TAB 2: Historial de Membresías -->
            <div v-if="activeTab === 'memberships'" class="space-y-4">
              <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                  <thead>
                    <tr class="bg-neutral-50 text-neutral-500 font-bold">
                      <th class="p-3">Nombre del Plan</th>
                      <th class="p-3">Fecha de Inicio</th>
                      <th class="p-3">Fecha de Vencimiento</th>
                      <th class="p-3">Estatus</th>
                      <th v-if="authStore.userRole === 'owner'" class="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ms in memberStore.activeMemberships" :key="ms.id" class="border-b border-neutral-100">
                      <td class="p-3 font-bold text-neutral-900">{{ ms.planName }}</td>
                      <td class="p-3 text-neutral-500">{{ ms.startDate }}</td>
                      <td class="p-3 text-neutral-500">{{ ms.endDate }}</td>
                      <td class="p-3">
                        <span 
                          class="px-2 py-0.5 rounded text-[10px] font-semibold animate-none"
                          :class="{
                            'bg-emerald-50 text-emerald-600': ms.status === 'ACTIVE',
                            'bg-amber-50 text-amber-600': ms.status === 'PENDING',
                            'bg-red-50 text-red-600': ms.status === 'EXPIRED',
                            'bg-neutral-100 text-neutral-600': ms.status === 'CANCELLED',
                          }"
                        >
                          {{ ms.status === 'ACTIVE' ? 'ACTIVA' : ms.status === 'PENDING' ? 'PENDIENTE' : ms.status === 'EXPIRED' ? 'EXPIRADA' : 'CANCELADA' }}
                        </span>
                      </td>
                      <td v-if="authStore.userRole === 'owner'" class="p-3 text-right">
                        <button 
                          @click="openEditMembership(ms)"
                          class="text-[10px] font-bold text-neutral-600 bg-neutral-100 hover:bg-black hover:text-white px-2.5 py-1 rounded transition-all"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr v-if="memberStore.activeMemberships.length === 0">
                      <td colspan="5" class="p-4 text-center text-neutral-400">Aún no se ha asignado ningún plan de membresía.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 3: Recibos de Pagos -->
            <div v-if="activeTab === 'payments'" class="space-y-4">
              <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                  <thead>
                    <tr class="bg-neutral-50 text-neutral-500 font-bold">
                      <th class="p-3">Ref. Recibo</th>
                      <th class="p-3">Método de Pago</th>
                      <th class="p-3">Fecha de Pago</th>
                      <th class="p-3">Procesado por</th>
                      <th class="p-3">Monto</th>
                      <th class="p-3 text-right">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pay in memberStore.activePayments" :key="pay.id" class="border-b border-neutral-100">
                      <td class="p-3 font-mono font-semibold text-neutral-700">{{ pay.referenceNumber }}</td>
                      <td class="p-3 text-neutral-600">{{ pay.paymentMethodName }}</td>
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
                    </tr>
                    <tr v-if="memberStore.activePayments.length === 0">
                      <td colspan="6" class="p-4 text-center text-neutral-400">No se han encontrado recibos de pago.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        <!-- Sin miembro seleccionado -->
        <div v-else class="premium-card bg-white p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-neutral-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="text-sm font-bold text-neutral-800">Ningún Perfil Seleccionado</h3>
          <p class="text-xs text-neutral-400 mt-2">Selecciona un miembro de la lista para ver observaciones, dirección e historial de membresías.</p>
        </div>

      </div>

    </div>

    <!-- MODAL EDITAR MEMBRESÍA (OWNER ONLY) -->
    <div v-if="showEditMembershipModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-widest">Editar Membresía</h3>
          <button @click="showEditMembershipModal = false" class="text-neutral-400 hover:text-neutral-600">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSaveMembership" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Plan de Membresía</label>
            <select 
              v-model="membershipForm.planId" 
              required
              class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900"
            >
              <option v-for="plan in memberStore.plans" :key="plan.id" :value="plan.id">
                {{ plan.name }} (${{ plan.price / 100 }} MXN)
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha de Inicio</label>
              <input 
                v-model="membershipForm.startDate" 
                type="date" 
                required
                class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900"
              />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Fecha de Fin</label>
              <input 
                v-model="membershipForm.endDate" 
                type="date" 
                required
                class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Estatus</label>
            <select 
              v-model="membershipForm.status" 
              required
              class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900"
            >
              <option value="PENDING">PENDIENTE</option>
              <option value="ACTIVE">ACTIVA</option>
              <option value="CANCELLED">CANCELADA</option>
              <option value="EXPIRED">EXPIRADA</option>
            </select>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-neutral-100">
            <button 
              type="button" 
              @click="showEditMembershipModal = false"
              class="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              class="flex-1 bg-[#FA2F2A] hover:bg-[#d6201b] text-white py-2.5 rounded-xl font-bold shadow-sm transition-all"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN DE DESACTIVACIÓN -->
    <div 
      v-if="showDeactivateModal" 
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-dialog-title"
    >
      <div class="bg-neutral-950 border border-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div class="space-y-2 text-center md:text-left">
          <h3 id="deactivate-dialog-title" class="text-base font-bold text-white uppercase tracking-widest flex items-center justify-center md:justify-start space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Desactivar Miembro</span>
          </h3>
          <p class="text-sm text-neutral-200 pt-2">
            ¿Estás seguro de que deseas desactivar al miembro <strong class="text-white font-bold">{{ memberStore.selectedMember?.firstName }} {{ memberStore.selectedMember?.lastName }}</strong>?
          </p>
          <p class="text-xs text-neutral-400">
            Esta acción revocará su estatus activo y sus accesos al gimnasio hasta que se vuelva a activar manualmente.
          </p>
        </div>

        <div class="flex space-x-3 pt-4 border-t border-neutral-900">
          <button 
            ref="cancelBtnRef"
            type="button" 
            @click="closeDeactivateModal"
            class="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 py-2.5 rounded-xl font-bold transition-all border border-neutral-800 text-xs"
          >
            Cancelar
          </button>
          <button 
            ref="confirmBtnRef"
            type="button"
            @click="confirmDeactivate"
            :disabled="isDeactivating"
            class="flex-1 bg-red-650 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs disabled:opacity-55"
          >
            {{ isDeactivating ? 'Procesando...' : 'Sí, Desactivar' }}
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
