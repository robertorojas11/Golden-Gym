<script setup lang="ts">
import { onMounted } from 'vue';
import { useMemberStore } from '../stores/member.store';

const store = useMemberStore();

onMounted(() => {
  store.fetchPlans();
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight text-neutral-900">Tarifas y Planes de Membresía</h2>
      <p class="text-xs text-neutral-500 mt-1">Parámetros comerciales de acceso (duración, precio, niveles)</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="plan in store.plans" 
        :key="plan.id" 
        class="premium-card p-6 bg-white flex flex-col justify-between space-y-4"
      >
        <div class="space-y-2">
          <div class="flex justify-between items-start">
            <h3 class="text-sm font-bold text-neutral-900">{{ plan.name }}</h3>
            <span class="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[9px] font-bold uppercase">
              {{ plan.durationDays }} Días
            </span>
          </div>
          <p class="text-xs text-neutral-500 leading-relaxed">{{ plan.description }}</p>
        </div>

        <div class="pt-4 border-t border-neutral-100 flex items-baseline justify-between">
          <span class="text-xs text-neutral-400">Precio</span>
          <span class="text-2xl font-bold text-neutral-900">${{ plan.price / 100 }} MXN</span>
        </div>
      </div>
    </div>
  </div>
</template>
