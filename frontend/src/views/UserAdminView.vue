<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useSyncStore } from '../stores/sync.store';

const authStore = useAuthStore();
const syncStore = useSyncStore();
const staff = ref<any[]>([]);

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

function getHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function fetchStaff() {
  try {
    const res = await fetch(`${API_URL}/auth/users`, { headers: getHeaders() });
    if (res.ok) {
      staff.value = await res.json();
    }
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  fetchStaff();
});

const activeStaff = computed(() => staff.value.filter((s) => s.isActive));
const inactiveStaff = computed(() => staff.value.filter((s) => !s.isActive));
const showInactive = ref(false);

// Add / Edit Modal state
const showAddEditModal = ref(false);
const isEditing = ref(false);
const editingStaffId = ref<string | null>(null);
const resetPasswordCheckbox = ref(false);

const staffForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  roleName: 'Recepcionista',
  password: '',
});

const staffCancelBtnRef = ref<HTMLElement | null>(null);
const staffConfirmBtnRef = ref<HTMLElement | null>(null);

// Deactivate Modal state
const showDeactivateModal = ref(false);
const selectedStaff = ref<any | null>(null);
const deactCancelBtnRef = ref<HTMLElement | null>(null);
const deactConfirmBtnRef = ref<HTMLElement | null>(null);

// Toast state
const showToast = ref(false);
const toastMessage = ref('');

function triggerToast(msg: string) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
}

function openAddModal() {
  isEditing.value = false;
  editingStaffId.value = null;
  staffForm.value = {
    firstName: '',
    lastName: '',
    email: '',
    roleName: 'Recepcionista',
    password: '',
  };
  showAddEditModal.value = true;
}

function openEditModal(user: any) {
  isEditing.value = true;
  editingStaffId.value = user.id;
  staffForm.value = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    roleName: user.roleName,
    password: '',
  };
  resetPasswordCheckbox.value = false;
  showAddEditModal.value = true;
}

function closeAddEditModal() {
  showAddEditModal.value = false;
}

async function saveStaff() {
  try {
    if (isEditing.value && editingStaffId.value) {
      const payload: any = {
        firstName: staffForm.value.firstName,
        lastName: staffForm.value.lastName,
        email: staffForm.value.email,
        roleName: staffForm.value.roleName,
      };
      if (resetPasswordCheckbox.value && staffForm.value.password) {
        payload.password = staffForm.value.password;
      }
      const res = await fetch(`${API_URL}/auth/users/${editingStaffId.value}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        triggerToast('Información de personal actualizada correctamente.');
        syncStore.registerModification('EDICION_PERSONAL', `Personal actualizado: ${staffForm.value.firstName} ${staffForm.value.lastName}`);
      } else {
        triggerToast('Error al actualizar el personal.');
      }
    } else {
      const payload = {
        firstName: staffForm.value.firstName,
        lastName: staffForm.value.lastName,
        email: staffForm.value.email,
        roleName: staffForm.value.roleName,
        password: staffForm.value.password,
      };
      const res = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        triggerToast('Personal registrado correctamente.');
        syncStore.registerModification('CREACION_PERSONAL', `Personal creado: ${staffForm.value.firstName} ${staffForm.value.lastName}`);
      } else {
        triggerToast('Error al registrar el personal.');
      }
    }
    showAddEditModal.value = false;
    await fetchStaff();
  } catch (err) {
    console.error(err);
    triggerToast('Ocurrió un error inesperado.');
  }
}

function openDeactivateModal(user: any) {
  selectedStaff.value = user;
  showDeactivateModal.value = true;
}

function closeDeactivateModal() {
  showDeactivateModal.value = false;
  selectedStaff.value = null;
}

async function confirmDeactivate() {
  if (!selectedStaff.value) return;
  try {
    const res = await fetch(`${API_URL}/auth/users/${selectedStaff.value.id}/toggle`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      triggerToast(`Personal ${selectedStaff.value.firstName} desactivado correctamente.`);
      syncStore.registerModification('DESACTIVACION_PERSONAL', `Personal desactivado: ${selectedStaff.value.firstName} ${selectedStaff.value.lastName}`);
      await fetchStaff();
    } else {
      triggerToast('Error al desactivar el personal.');
    }
  } catch (err) {
    console.error(err);
    triggerToast('Error inesperado.');
  }
  closeDeactivateModal();
}

async function reactivateStaff(user: any) {
  try {
    const res = await fetch(`${API_URL}/auth/users/${user.id}/toggle`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      triggerToast(`Personal ${user.firstName} reactivado correctamente.`);
      syncStore.registerModification('REACTIVACION_PERSONAL', `Personal reactivado: ${user.firstName} ${user.lastName}`);
      await fetchStaff();
    } else {
      triggerToast('Error al reactivar el personal.');
    }
  } catch (err) {
    console.error(err);
    triggerToast('Error inesperado.');
  }
}

// Keyboard focus trap watch blocks
watch(showAddEditModal, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', handleAddEditKeys);
    setTimeout(() => {
      staffCancelBtnRef.value?.focus();
    }, 50);
  } else {
    window.removeEventListener('keydown', handleAddEditKeys);
  }
});

function handleAddEditKeys(e: KeyboardEvent) {
  if (e.key === 'Escape') closeAddEditModal();
  if (e.key === 'Tab') {
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      if (activeEl === staffCancelBtnRef.value) {
        staffConfirmBtnRef.value?.focus();
        e.preventDefault();
      }
    } else {
      if (activeEl === staffConfirmBtnRef.value) {
        staffCancelBtnRef.value?.focus();
        e.preventDefault();
      }
    }
  }
}

watch(showDeactivateModal, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', handleDeactivateKeys);
    setTimeout(() => {
      deactCancelBtnRef.value?.focus();
    }, 50);
  } else {
    window.removeEventListener('keydown', handleDeactivateKeys);
  }
});

function handleDeactivateKeys(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDeactivateModal();
  if (e.key === 'Tab') {
    const activeEl = document.activeElement;
    if (e.shiftKey) {
      if (activeEl === deactCancelBtnRef.value) {
        deactConfirmBtnRef.value?.focus();
        e.preventDefault();
      }
    } else {
      if (activeEl === deactConfirmBtnRef.value) {
        deactCancelBtnRef.value?.focus();
        e.preventDefault();
      }
    }
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleAddEditKeys);
  window.removeEventListener('keydown', handleDeactivateKeys);
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-neutral-900">Administración de Usuarios</h2>
      <p class="text-xs text-neutral-500 mt-1">Gestión de cuentas del personal, roles y asignación de permisos</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- IZQUIERDA: Cuentas del personal (col-span-8) -->
      <div class="lg:col-span-8 premium-card bg-white p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Personal Activo</h3>
          <button 
            v-if="authStore.userRole === 'owner'"
            @click="openAddModal"
            class="bg-[#FA2F2A] hover:bg-[#d6201b] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
          >
            <span>+</span>
            <span>Agregar Personal</span>
          </button>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="user in activeStaff" 
            :key="user.id" 
            class="flex items-center justify-between border-b border-neutral-900 pb-4 last:border-0 last:pb-0 group/row p-2 rounded-xl hover:bg-neutral-900/40 transition-all"
          >
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-sm border border-neutral-800">
                {{ user.firstName.substring(0,1) }}{{ user.lastName.substring(0,1) }}
              </div>
              <div>
                <p class="text-xs font-bold text-white">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-[10px] text-neutral-400 font-mono">{{ user.email }}</p>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <span class="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded text-[10px] font-bold uppercase">
                {{ user.roleName }}
              </span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>

              <!-- Action buttons: Render only if user is not Owner himself -->
              <div v-if="user.email !== 'goldencorpsgym@gmail.com' && authStore.userRole === 'owner'" class="flex items-center space-x-2 md:opacity-0 group-hover/row:opacity-100 transition-opacity">
                <button 
                  @click="openEditModal(user)"
                  class="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-all"
                  title="Editar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  @click="openDeactivateModal(user)"
                  class="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-500 transition-all"
                  title="Desactivar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- COLLAPSIBLE INACTIVE STAFF SECTION -->
        <div class="mt-6 border-t border-neutral-900 pt-6">
          <button 
            @click="showInactive = !showInactive"
            class="flex items-center space-x-2 text-xs font-bold text-neutral-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            <span>Personal Inactivo ({{ inactiveStaff.length }})</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              class="h-4.5 w-4.5 transform transition-transform" 
              :class="{ 'rotate-180': showInactive }"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div v-show="showInactive" class="mt-4 space-y-4 animate-in fade-in duration-200">
            <div 
              v-for="user in inactiveStaff" 
              :key="user.id" 
              class="flex items-center justify-between border-b border-neutral-900 pb-4 last:border-0 last:pb-0 p-2 rounded-xl bg-neutral-950/20"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full bg-neutral-900 text-neutral-500 font-bold flex items-center justify-center text-sm border border-neutral-800">
                  {{ user.firstName.substring(0,1) }}{{ user.lastName.substring(0,1) }}
                </div>
                <div>
                  <p class="text-xs font-bold text-neutral-400">{{ user.firstName }} {{ user.lastName }}</p>
                  <p class="text-[10px] text-neutral-500 font-mono">{{ user.email }}</p>
                </div>
              </div>

              <div class="flex items-center space-x-4">
                <span class="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-500 rounded text-[10px] font-bold uppercase">
                  {{ user.roleName }}
                </span>
                <span class="w-2.5 h-2.5 rounded-full bg-neutral-600"></span>
                
                <button 
                  v-if="authStore.userRole === 'owner'"
                  @click="reactivateStaff(user)"
                  class="text-[10px] font-bold text-neutral-400 hover:text-emerald-500 transition-colors"
                >
                  Reactivar
                </button>
              </div>
            </div>
            
            <p v-if="inactiveStaff.length === 0" class="text-center text-xs text-neutral-500 py-4 font-mono">
              No hay personal inactivo.
            </p>
          </div>
        </div>

      </div>

      <!-- DERECHA: Roles de seguridad (col-span-4) -->
      <div class="lg:col-span-4 premium-card bg-neutral-900 text-white p-6 space-y-6">
        <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Seguridad Jerárquica RBAC</h3>
        
        <div class="space-y-4 text-xs">
          <div class="border-l-2 border-red-500 pl-3">
            <p class="font-bold text-white uppercase">Propietario (Owner)</p>
            <p class="text-neutral-400 mt-1">Acceso total a configuraciones, personal, respaldos de BD y reportes financieros.</p>
          </div>

          <div class="border-l-2 border-amber-500 pl-3">
            <p class="font-bold text-white uppercase">Administrador (Admin)</p>
            <p class="text-neutral-400 mt-1">Gestión de planes de membresía, inscripciones de miembros y cobros de sucursal.</p>
          </div>

          <div class="border-l-2 border-emerald-500 pl-3">
            <p class="font-bold text-white uppercase">Recepcionista</p>
            <p class="text-neutral-400 mt-1">Registro de entradas en lector, inscripciones y cobros básicos. Sin permisos de eliminación ni reembolsos.</p>
          </div>

          <div class="border-l-2 border-neutral-500 pl-3">
            <p class="font-bold text-white uppercase">Visor (Viewer)</p>
            <p class="text-neutral-400 mt-1">Acceso de sólo lectura para ver gráficas estadísticas de tránsito e ingresos mensuales.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL AGREGAR / EDITAR PERSONAL -->
    <div 
      v-if="showAddEditModal" 
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto p-4 flex justify-center items-start"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-dialog-title"
    >
      <div class="bg-neutral-950 border border-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
        <div class="flex justify-between items-center pb-2 border-b border-neutral-900">
          <h3 id="staff-dialog-title" class="text-sm font-bold text-white uppercase tracking-widest">
            {{ isEditing ? 'Editar Personal' : 'Agregar Nuevo Personal' }}
          </h3>
          <button @click="closeAddEditModal" class="text-neutral-400 hover:text-white">✕</button>
        </div>

        <form @submit.prevent="saveStaff" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase mb-1">Nombre</label>
              <input v-model="staffForm.firstName" type="text" required class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900" />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase mb-1">Apellidos</label>
              <input v-model="staffForm.lastName" type="text" required class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase mb-1">Correo Electrónico</label>
            <input v-model="staffForm.email" type="email" required class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900" />
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase mb-1">Rol</label>
            <select v-model="staffForm.roleName" required class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900">
              <option value="Administrador">Administrador</option>
              <option value="Recepcionista">Recepcionista</option>
              <option value="Visor">Visor</option>
            </select>
          </div>

          <!-- Password fields -->
          <div v-if="!isEditing">
            <label class="block font-bold text-neutral-400 uppercase mb-1">Contraseña Temporal</label>
            <input v-model="staffForm.password" type="password" required class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900" />
          </div>
          <div v-else class="space-y-2">
            <div class="flex items-center space-x-2 py-1">
              <input v-model="resetPasswordCheckbox" type="checkbox" id="resetPasswordCheckbox" class="rounded text-black focus:ring-neutral-900" />
              <label for="resetPasswordCheckbox" class="font-semibold text-neutral-300 cursor-pointer select-none">Restablecer contraseña</label>
            </div>
            <div v-if="resetPasswordCheckbox">
              <label class="block font-bold text-neutral-400 uppercase mb-1">Nueva Contraseña</label>
              <input v-model="staffForm.password" type="password" required class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900" />
            </div>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-neutral-900">
            <button 
              ref="staffCancelBtnRef"
              type="button" 
              @click="closeAddEditModal"
              class="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 py-2.5 rounded-xl font-bold transition-all border border-neutral-800"
            >
              Cancelar
            </button>
            <button 
              ref="staffConfirmBtnRef"
              type="submit"
              class="flex-1 bg-[#FA2F2A] hover:bg-[#d6201b] text-white py-2.5 rounded-xl font-bold shadow-sm transition-all"
            >
              {{ isEditing ? 'Guardar Cambios' : 'Registrar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL CONFIRMACIÓN DESACTIVAR STAFF -->
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
            <span>Desactivar Personal</span>
          </h3>
          <p class="text-sm text-neutral-200 pt-2">
            ¿Estás seguro de que deseas desactivar a <strong class="text-white font-bold">{{ selectedStaff?.firstName }} {{ selectedStaff?.lastName }}</strong>?
          </p>
          <p class="text-xs text-neutral-400">
            Esta cuenta perderá el acceso al sistema inmediatamente.
          </p>
        </div>

        <div class="flex space-x-3 pt-4 border-t border-neutral-900">
          <button 
            ref="deactCancelBtnRef"
            type="button" 
            @click="closeDeactivateModal"
            class="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 py-2.5 rounded-xl font-bold transition-all border border-neutral-800 text-xs"
          >
            Cancelar
          </button>
          <button 
            ref="deactConfirmBtnRef"
            type="button"
            @click="confirmDeactivate"
            class="flex-1 bg-red-650 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold shadow-sm transition-all text-xs"
          >
            Confirmar Desactivación
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
