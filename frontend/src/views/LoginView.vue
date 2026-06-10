<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('reception@goldengym.local');
const password = ref('Password123');
const errorMsg = ref('');
const isLoading = ref(false);

const API_URL = 'http://localhost:3000';

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
    router.push('/');
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

    <div class="max-w-md w-full bg-black/85 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-850 p-8 z-10">
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
            placeholder="nombre@goldengym.local"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Contraseña</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA2F2A] transition-all"
            placeholder="••••••••"
          />
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
