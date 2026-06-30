<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMemberStore } from '../stores/member.store';
import { useAuthStore } from '../stores/auth.store';

const store = useMemberStore();
const authStore = useAuthStore();

onMounted(() => {
  store.fetchPlans();
});

const showEditModal = ref(false);
const isCreateMode = ref(false);
const editingPlan = ref<any>(null);
const planForm = ref({
  name: '',
  price: 0,
  durationDays: 30,
  description: '',
  isActive: true,
  isGroup: false,
  maxMembers: 2,
});

function openCreate() {
  isCreateMode.value = true;
  editingPlan.value = null;
  planForm.value = {
    name: '',
    price: 0,
    durationDays: 30,
    description: '',
    isActive: true,
    isGroup: false,
    maxMembers: 2,
  };
  showEditModal.value = true;
}

function openEdit(plan: any) {
  isCreateMode.value = false;
  editingPlan.value = plan;
  planForm.value = {
    name: plan.name,
    price: plan.price / 100, // convert cents to unit
    durationDays: plan.durationDays,
    description: plan.description || '',
    isActive: plan.isActive !== false,
    isGroup: plan.isGroup === true,
    maxMembers: plan.maxMembers || 2,
  };
  showEditModal.value = true;
}

async function handleSave() {
  const payload = {
    ...planForm.value,
    price: Math.round(planForm.value.price * 100), // convert to cents
  };
  
  let ok = false;
  if (isCreateMode.value) {
    ok = await store.createPlan(payload);
  } else if (editingPlan.value) {
    ok = await store.updatePlan(editingPlan.value.id, payload);
  }

  if (ok) {
    showEditModal.value = false;
    editingPlan.value = null;
  } else {
    alert(isCreateMode.value ? 'Error al crear el plan' : 'Error al actualizar el plan');
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-neutral-900 font-sans">Tarifas y Planes de Membresía</h2>
        <p class="text-xs text-neutral-500 mt-1 font-sans">Parámetros comerciales de acceso (duración, precio, niveles)</p>
      </div>
      <button 
        v-if="authStore.userRole === 'owner'"
        @click="openCreate()"
        class="bg-[#FA2F2A] hover:bg-[#d6201b] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 font-sans cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nuevo Plan</span>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
      <div 
        v-for="plan in store.plans" 
        :key="plan.id" 
        class="premium-card p-6 bg-white flex flex-col justify-between space-y-4 relative border border-neutral-100 rounded-2xl shadow-sm"
        :class="{ 
          'opacity-60': plan.isActive === false
        }"
      >
        <div class="space-y-2">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <div class="flex items-center space-x-1.5">
                <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wide">{{ plan.name }}</h3>
                <span v-if="plan.isGroup" class="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-650 rounded text-[8px] font-bold uppercase tracking-wide">
                  Grupal ({{ plan.maxMembers }} pers.)
                </span>
              </div>
              <span v-if="plan.isActive === false" class="inline-block px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-bold uppercase">
                Inactivo
              </span>
            </div>
            <span 
              class="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[9px] font-bold uppercase font-mono"
            >
              {{ plan.durationDays }} Días
            </span>
          </div>
          <p class="text-xs text-neutral-500 leading-relaxed font-sans">{{ plan.description }}</p>
        </div>

        <div class="pt-4 border-t border-neutral-100 flex items-center justify-between font-sans">
          <div class="flex flex-col">
            <span class="text-[9px] text-neutral-400 uppercase font-semibold">Precio</span>
            <span class="text-xl font-extrabold text-neutral-900 font-mono">${{ plan.price / 100 }} MXN</span>
          </div>
          <button 
            v-if="authStore.userRole === 'owner'"
            @click="openEdit(plan)"
            class="text-[10px] font-bold text-neutral-600 bg-neutral-100 hover:bg-black hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Editar Plan
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL EDITAR / CREAR PLAN -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in duration-200">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-widest font-sans">
            {{ isCreateMode ? 'Registrar Nuevo Plan' : 'Editar Plan de Membresía' }}
          </h3>
          <button @click="showEditModal = false" class="text-neutral-400 hover:text-neutral-600 cursor-pointer">
            ✕
          </button>
        </div>

        <form @submit.prevent="handleSave" class="space-y-4 text-xs font-sans">
          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Nombre del Plan</label>
            <input 
              v-model="planForm.name" 
              type="text" 
              required
              class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900 text-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Duración (Días)</label>
              <input 
                v-model.number="planForm.durationDays" 
                type="number" 
                required
                min="1"
                class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900 text-sm"
              />
            </div>
            <div>
              <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Precio (MXN)</label>
              <input 
                v-model.number="planForm.price" 
                type="number" 
                required
                min="0"
                step="0.01"
                class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Descripción</label>
            <textarea 
              v-model="planForm.description" 
              rows="3"
              class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900 resize-none text-sm"
            ></textarea>
          </div>

          <div class="flex items-center space-x-2 py-2 border-t border-neutral-50 my-1">
            <input 
              v-model="planForm.isGroup" 
              type="checkbox" 
              id="isGroup" 
              class="rounded text-black focus:ring-neutral-900 cursor-pointer"
            />
            <label for="isGroup" class="font-semibold text-neutral-700 select-none cursor-pointer">Plan Grupal (Dúo, familiar, etc.)</label>
          </div>

          <div v-if="planForm.isGroup" class="animate-in slide-in-from-top-1 duration-150">
            <label class="block font-bold text-neutral-400 uppercase tracking-wider mb-1">Número de Personas Permitidas</label>
            <input 
              v-model.number="planForm.maxMembers" 
              type="number" 
              required
              min="2"
              class="w-full border rounded-lg px-3 py-2 focus:outline-neutral-900 text-sm"
            />
          </div>

          <div class="flex items-center space-x-2 py-2 border-t border-neutral-50">
            <input 
              v-model="planForm.isActive" 
              type="checkbox" 
              id="isActive" 
              class="rounded text-black focus:ring-neutral-900 cursor-pointer"
            />
            <label for="isActive" class="font-semibold text-neutral-700 select-none cursor-pointer">Plan Activo</label>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-neutral-100">
            <button 
              type="button" 
              @click="showEditModal = false"
              class="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 rounded-xl font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              class="flex-1 bg-[#FA2F2A] hover:bg-[#d6201b] text-white py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            >
              {{ isCreateMode ? 'Crear Plan' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
