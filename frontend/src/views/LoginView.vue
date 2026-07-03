<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const isLoading = ref(false);

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

async function handleLogin() {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (!res.ok) {
      throw new Error('Correo o contraseña incorrectos');
    }

    const data = await res.json();
    authStore.setAuth(data.access_token, data.user);
    if (data.user.mustChangePassword) {
      router.push('/change-password');
    } else if (data.user.roleName === 'clock') {
      router.push('/access-control');
    } else if (data.user.roleName === 'receptionist') {
      router.push('/members');
    } else {
      router.push('/');
    }
  } catch (error: any) {
    errorMsg.value = error.message || 'Error al iniciar sesión. Verifica que el servidor esté activo.';
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
      <div class="text-center mb-8">
        <!-- Gym Logo -->
        <img src="/Logo.png" alt="Golden Gym Logo" class="h-36 object-contain mx-auto mb-4" />
        <h2 class="text-2xl font-bold text-white tracking-tight">Acceso Golden Gym</h2>
        <p class="text-sm text-neutral-400 mt-2">Consola de Recepción Local</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Correo del Personal</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA2F2A] transition-all"
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Contraseña</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA2F2A] transition-all"
              placeholder="contraseña"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-450 hover:text-white cursor-pointer focus:outline-none"
            >
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="bg-red-950/50 border border-[#FA2F2A]/30 text-[#FA2F2A] rounded-lg p-3 text-xs text-center font-medium">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-[#FA2F2A] text-white py-3 rounded-lg text-sm font-semibold tracking-wide hover:bg-[#d6201b] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <span v-if="isLoading">Autenticando...</span>
          <span v-else>Entrar al Sistema</span>
        </button>
      </form>

      <div class="mt-8 pt-6 border-t border-neutral-900 text-center">
        <p class="text-xs text-neutral-500">
          Modo Local Sin Conexión (Offline-First) • Base de Datos Activa
        </p>
      </div>
    </div>
  </div>
</template>
