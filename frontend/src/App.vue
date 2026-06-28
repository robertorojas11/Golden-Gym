<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth.store';
import { useSyncStore } from './stores/sync.store';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();

const isLoginPage = computed(() => route.path === '/login');
const showPopover = ref(false);
const isMobileMenuOpen = ref(false);

function togglePopover() {
  showPopover.value = !showPopover.value;
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

watch(() => route.path, () => {
  closeMobileMenu();
});

onMounted(() => {
  syncStore.init();
});
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex flex-col font-sans">
    
    <!-- ENCABEZADO GLOBAL: 70px a 90px de alto fijo, fondo negro -->
    <header 
      v-if="!isLoginPage" 
      class="bg-black text-white h-20 px-8 flex items-center justify-between border-b border-neutral-900 shadow-md sticky top-0 z-40 select-none"
    >
      <!-- Izquierda: Título y Navegación -->
      <div class="flex items-center space-x-8">
        <!-- Bloque de Logotipo -->
        <router-link to="/" class="flex items-center space-x-3 group">
          <img src="/Logo.png" alt="GG Logo" class="h-14 object-contain" />
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

      <!-- Derecha: Perfil de usuario, Indicador de Sincronización y Cerrar Sesión -->
      <div class="flex items-center space-x-4">
        <!-- Indicador de Sincronización -->
        <div class="relative">
          <button 
            @click="togglePopover"
            class="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 rounded-lg transition-all focus:outline-none cursor-pointer"
          >
            <!-- Status indicator light -->
            <span class="relative flex h-2 w-2">
              <span 
                v-if="syncStore.syncState === 'synchronizing'"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"
              ></span>
              <span 
                class="relative inline-flex rounded-full h-2 w-2"
                :class="{
                  'bg-emerald-500': syncStore.syncState === 'synchronized',
                  'bg-amber-500': syncStore.syncState === 'synchronizing',
                  'bg-neutral-500': syncStore.syncState === 'offline',
                }"
              ></span>
            </span>
            <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-300">
              {{ 
                syncStore.syncState === 'synchronized' ? 'Sincronizado' :
                syncStore.syncState === 'synchronizing' ? 'Sincronizando' : 'Sin conexión'
              }}
              <span v-if="syncStore.pendingModifications.length > 0" class="ml-1 text-[#FFA624] font-mono">
                ({{ syncStore.pendingModifications.length }})
              </span>
            </span>
          </button>

          <!-- Popover showing sync state details and last 5 events -->
          <div 
            v-if="showPopover" 
            class="absolute right-0 mt-2 w-72 bg-[#121212] border border-neutral-850 rounded-xl shadow-2xl p-4 z-50 text-xs text-neutral-300 space-y-3"
          >
            <div class="flex justify-between items-center pb-2 border-b border-neutral-800">
              <span class="font-bold text-white uppercase tracking-wider text-[10px]">Estado de Sincronización</span>
              <button @click="showPopover = false" class="text-neutral-500 hover:text-white text-base leading-none">&times;</button>
            </div>
            
            <div class="space-y-1">
              <div class="flex justify-between">
                <span>Modo de red:</span>
                <span :class="syncStore.isOnline ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold'">
                  {{ syncStore.isOnline ? 'En línea' : 'Sin conexión' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Cambios pendientes:</span>
                <span class="font-mono" :class="syncStore.pendingModifications.length > 0 ? 'text-[#FFA624] font-bold' : 'text-neutral-400'">
                  {{ syncStore.pendingModifications.length }}
                </span>
              </div>
            </div>

            <!-- Manual sync button if online or pending -->
            <button 
              v-if="syncStore.isOnline && syncStore.pendingModifications.length > 0"
              @click="syncStore.triggerSync"
              class="w-full bg-[#FA2F2A] hover:bg-[#d6201b] text-white text-[10px] font-bold py-1.5 rounded uppercase tracking-wider transition-all"
            >
              Sincronizar ahora
            </button>

            <div class="space-y-2 pt-2 border-t border-neutral-800">
              <p class="font-semibold text-neutral-400 uppercase tracking-widest text-[8px]">Últimos eventos</p>
              <div class="space-y-1.5 max-h-36 overflow-y-auto">
                <div 
                  v-for="event in syncStore.syncEvents.slice(0, 5)" 
                  :key="event.id"
                  class="flex justify-between text-[9px] border-b border-neutral-800/40 pb-1 last:border-0 last:pb-0"
                >
                  <span class="truncate max-w-[190px]" :title="event.message">{{ event.message }}</span>
                  <span class="text-neutral-500 font-mono shrink-0">{{ event.timestamp }}</span>
                </div>
                <p v-if="syncStore.syncEvents.length === 0" class="text-neutral-600 text-[9px] italic text-center">Sin eventos</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón de Cerrar Sesión -->
        <button 
          @click="handleLogout"
          class="hidden md:block bg-[#FA2F2A] hover:bg-[#d6201b] text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg tracking-wider transition-all"
        >
          Cerrar Sesión
        </button>

        <!-- Hamburger Button (Mobile Only) -->
        <button 
          @click="toggleMobileMenu" 
          class="md:hidden text-white hover:text-[#FA2F2A] transition-colors focus:outline-none cursor-pointer p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="!isMobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- MOBILE MENU DRAWER (Mobile Only) -->
    <div 
      v-if="isMobileMenuOpen && !isLoginPage" 
      class="md:hidden fixed inset-x-0 top-20 bottom-0 bg-black/95 backdrop-blur-md z-30 flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-top-5 duration-200 border-t border-neutral-900"
    >
      <nav class="flex flex-col space-y-5 text-sm font-bold uppercase tracking-wider text-neutral-400">
        <router-link to="/" class="hover:text-white transition-colors py-1" active-class="text-white border-l-4 border-[#FA2F2A] pl-3">
          Inicio
        </router-link>
        <router-link to="/access-control" class="hover:text-white transition-colors py-1" active-class="text-white border-l-4 border-[#FA2F2A] pl-3">
          Control de Acceso
        </router-link>
        <router-link to="/members" class="hover:text-white transition-colors py-1" active-class="text-white border-l-4 border-[#FA2F2A] pl-3">
          Miembros
        </router-link>
        <router-link to="/memberships" class="hover:text-white transition-colors py-1" active-class="text-white border-l-4 border-[#FA2F2A] pl-3">
          Planes
        </router-link>
        <router-link to="/payments" class="hover:text-white transition-colors py-1" active-class="text-white border-l-4 border-[#FA2F2A] pl-3">
          Pagos
        </router-link>
        <router-link 
          v-if="authStore.userRole === 'owner'" 
          to="/users" 
          class="hover:text-white transition-colors py-1" 
          active-class="text-white border-l-4 border-[#FA2F2A] pl-3"
        >
          Personal
        </router-link>
      </nav>

      <hr class="border-neutral-900" />

      <!-- Cerrar Sesión Mobile -->
      <button 
        @click="handleLogout(); closeMobileMenu();"
        class="w-full bg-[#FA2F2A] hover:bg-[#d6201b] text-white text-xs font-bold uppercase py-3 rounded-xl tracking-wider transition-all cursor-pointer shadow-md"
      >
        Cerrar Sesión
      </button>
    </div>

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
