<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const newPassword = ref('');
const confirmPassword = ref('');
const errorMsg = ref('');
const successMsg = ref('');
const isLoading = ref(false);

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

const hasMinLength = computed(() => newPassword.value.length >= 8);
const hasNumber = computed(() => /\d/.test(newPassword.value));
const hasSpecialChar = computed(() => /[^A-Za-z0-9]/.test(newPassword.value));
const isMatch = computed(() => newPassword.value === confirmPassword.value && confirmPassword.value !== '');

const isValid = computed(() => hasMinLength.value && hasNumber.value && hasSpecialChar.value && isMatch.value);

async function handleSubmit() {
  if (!isValid.value) return;
  
  isLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword: newPassword.value }),
    });

    if (!res.ok) {
      throw new Error('No se pudo cambiar la contraseña. Intente nuevamente.');
    }

    successMsg.value = 'Contraseña cambiada con éxito. Redirigiendo...';
    
    // Update local store
    if (authStore.user) {
      authStore.user.mustChangePassword = false;
      localStorage.setItem('user_payload', JSON.stringify(authStore.user));
    }
    
    setTimeout(() => {
      router.push('/');
    }, 1500);
  } catch (error: any) {
    errorMsg.value = error.message || 'Error al cambiar la contraseña.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-black relative overflow-hidden px-4">
    <!-- Background Image with Blur -->
    <div 
      class="absolute inset-0 bg-cover bg-center filter blur-md scale-105 opacity-65 z-0" 
      style="background-image: url('/Background.jpg');"
    ></div>
    <!-- Overlay for extra contrast -->
    <div class="absolute inset-0 bg-black/50 z-0"></div>

    <div class="max-w-md w-full bg-black/85 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-800 p-8 z-10">
      <div class="text-center mb-6">
        <img src="/Logo.png" alt="Golden Gym Logo" class="h-28 object-contain mx-auto mb-4" />
        <h2 class="text-2xl font-bold text-white tracking-tight">Cambiar Contraseña</h2>
        <p class="text-xs text-neutral-400 mt-2">
          Por seguridad, debes cambiar tu contraseña predeterminada en tu primer inicio de sesión.
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Nueva Contraseña</label>
          <input
            v-model="newPassword"
            type="password"
            required
            class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA2F2A] transition-all"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Confirmar Contraseña</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA2F2A] transition-all"
            placeholder="Repite la contraseña"
          />
        </div>

        <!-- Validation Indicators -->
        <div class="bg-neutral-950 p-3 rounded-lg border border-neutral-900 space-y-2 text-xs">
          <div class="flex items-center space-x-2">
            <span :class="hasMinLength ? 'text-emerald-500' : 'text-neutral-500'">●</span>
            <span :class="hasMinLength ? 'text-neutral-200' : 'text-neutral-400'">Mínimo 8 caracteres</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="hasNumber ? 'text-emerald-500' : 'text-neutral-500'">●</span>
            <span :class="hasNumber ? 'text-neutral-200' : 'text-neutral-400'">Al menos un número (0-9)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="hasSpecialChar ? 'text-emerald-500' : 'text-neutral-500'">●</span>
            <span :class="hasSpecialChar ? 'text-neutral-200' : 'text-neutral-400'">Al menos un caracter especial (#, $, @, etc.)</span>
          </div>
          <div class="flex items-center space-x-2">
            <span :class="isMatch ? 'text-emerald-500' : 'text-neutral-500'">●</span>
            <span :class="isMatch ? 'text-neutral-200' : 'text-neutral-400'">Las contraseñas coinciden</span>
          </div>
        </div>

        <div v-if="errorMsg" class="bg-red-950/50 border border-[#FA2F2A]/30 text-[#FA2F2A] rounded-lg p-3 text-xs text-center font-medium">
          {{ errorMsg }}
        </div>

        <div v-if="successMsg" class="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 rounded-lg p-3 text-xs text-center font-medium">
          {{ successMsg }}
        </div>

        <button
          type="submit"
          :disabled="isLoading || !isValid"
          class="w-full bg-[#FA2F2A] text-white py-3 rounded-lg text-sm font-semibold tracking-wide hover:bg-[#d6201b] transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Cambiando...</span>
          <span v-else>Guardar Contraseña</span>
        </button>
      </form>
    </div>
  </div>
</template>
