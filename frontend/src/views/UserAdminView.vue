<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store';

const authStore = useAuthStore();
const staff = ref<any[]>([]);

const API_URL = 'http://localhost:3000';

async function fetchStaff() {
  const token = authStore.token;
  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      staff.value = [
        { id: '1', firstName: 'Marcus', lastName: 'Gold', email: 'owner@goldengym.local', roleName: 'Propietario', isActive: true },
        { id: '2', firstName: 'Sarah', lastName: 'Connor', email: 'admin@goldengym.local', roleName: 'Administrador', isActive: true },
        { id: '3', firstName: 'Lucas', lastName: 'Vance', email: 'reception@goldengym.local', roleName: 'Recepcionista', isActive: true },
      ];
    }
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  fetchStaff();
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
        <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Personal Activo</h3>
        
        <div class="space-y-4">
          <div v-for="user in staff" :key="user.id" class="flex items-center justify-between border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-sm">
                {{ user.firstName.substring(0,1) }}{{ user.lastName.substring(0,1) }}
              </div>
              <div>
                <p class="text-xs font-bold text-neutral-800">{{ user.firstName }} {{ user.lastName }}</p>
                <p class="text-[10px] text-neutral-400 font-mono">{{ user.email }}</p>
              </div>
            </div>

            <div class="flex items-center space-x-3">
              <span class="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-bold uppercase">
                {{ user.roleName }}
              </span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
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
  </div>
</template>
