<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoginPage = computed(() => route.path === '/login');

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#F2F2F2] flex flex-col font-sans">
    
    <!-- ENCABEZADO GLOBAL: 70px a 90px de alto fijo, fondo negro -->
    <header 
      v-if="!isLoginPage" 
      class="bg-black text-white h-20 px-8 flex items-center justify-between border-b border-neutral-900 shadow-md sticky top-0 z-40 select-none"
    >
      <!-- Izquierda: Título y Navegación -->
      <div class="flex items-center space-x-8">
        <!-- Bloque de Logotipo -->
        <router-link to="/" class="flex items-center space-x-3 group">
          <div class="bg-[#FA2F2A] text-white w-9 h-9 rounded-lg font-bold flex items-center justify-center text-sm tracking-tighter">
            GG
          </div>
          <span class="font-extrabold text-base tracking-tight text-white group-hover:text-[#FA2F2A] transition-colors">
            GOLDEN GYM
          </span>
        </router-link>

        <!-- Menú de Navegación -->
        <nav class="hidden md:flex items-center space-x-5 text-xs font-bold uppercase tracking-wider text-neutral-400">
          <router-link to="/" class="hover:text-white transition-colors" active-class="text-white border-b-2 border-[#FA2F2A] pb-1">
            Inicio
          </router-link>
          <router-link to="/access-control" class="hover:text-white transition-colors" active-class="text-white border-b-2 border-[#FA2F2A] pb-1">
            Control de Acceso
          </router-link>
          <router-link to="/members" class="hover:text-white transition-colors" active-class="text-white border-b-2 border-[#FA2F2A] pb-1">
            Miembros
          </router-link>
          <router-link to="/memberships" class="hover:text-white transition-colors" active-class="text-white border-b-2 border-[#FA2F2A] pb-1">
            Planes
          </router-link>
          <router-link to="/payments" class="hover:text-white transition-colors" active-class="text-white border-b-2 border-[#FA2F2A] pb-1">
            Pagos
          </router-link>
          <router-link 
            v-if="authStore.userRole === 'owner'" 
            to="/users" 
            class="hover:text-white transition-colors" 
            active-class="text-white border-b-2 border-[#FA2F2A] pb-1"
          >
            Personal
          </router-link>
        </nav>
      </div>

      <!-- Derecha: Área reservada para logotipo y perfil de usuario -->
      <div class="flex items-center space-x-6">
        
        <!-- Marcador de logotipo del gimnasio -->
        <div class="border border-dashed border-neutral-700 bg-neutral-900 rounded-lg px-4 py-1.5 text-center flex flex-col justify-center items-center h-10 w-24">
          <span class="text-[9px] font-mono tracking-widest text-neutral-400 font-bold uppercase">Gym Logo</span>
        </div>

        <!-- Botón de Cerrar Sesión -->
        <button 
          @click="handleLogout"
          class="bg-[#FA2F2A] hover:bg-[#d6201b] text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg tracking-wider transition-all"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>

    <!-- Cuerpo principal de contenido -->
    <main class="flex-grow">
      <router-view />
    </main>

    <!-- Pie de página -->
    <footer v-if="!isLoginPage" class="bg-black text-neutral-500 py-6 text-center text-xs border-t border-neutral-950">
      <p>© 2026 Golden Gym Inc. • Servidor local sin conexión activa (Offline-First)</p>
    </footer>

  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
