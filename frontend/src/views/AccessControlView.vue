<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useBiometricStore } from '../stores/biometric.store';
import { useMemberStore } from '../stores/member.store';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'vue-router';

const store = useBiometricStore();
const memberStore = useMemberStore();
const authStore = useAuthStore();
const router = useRouter();

const timeString = ref('');
const dateString = ref('');
const selectedSimMemberId = ref('');
const manualSearchQuery = ref('');
const showSearchResults = ref(false);

const filteredMembers = computed(() => {
  const q = manualSearchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return memberStore.members.filter((m: any) => 
    m.firstName.toLowerCase().includes(q) || 
    m.lastName.toLowerCase().includes(q) || 
    m.memberNumber.toLowerCase().includes(q)
  );
});

function getMemberAvatarUrl(result: any): string {
  if (result?.photoUrl) return result.photoUrl;
  const member = memberStore.members.find(m => m.id === result?.memberId);
  const gender = member ? member.gender : '';
  const g = String(gender || '').toLowerCase();
  if (g.startsWith('f')) {
    return '/woman_placeholder.png';
  } else if (g.startsWith('m')) {
    return '/man_placeholder.png';
  } else {
    return '/other_placeholder.png';
  }
}

function selectManualMember(member: any) {
  selectedSimMemberId.value = member.id;
  manualSearchQuery.value = `${member.firstName} ${member.lastName}`;
  showSearchResults.value = false;
}

function clearManualSearch() {
  manualSearchQuery.value = '';
  selectedSimMemberId.value = '';
  showSearchResults.value = false;
}

function openMemberProfile(memberId?: string) {
  if (!memberId) return;
  router.push({ path: '/members', query: { selectMemberId: memberId } });
}

let clockInterval: any = null;

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  timeString.value = `${hours}:${minutes}:${seconds}`;

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateString.value = now.toLocaleDateString('es-MX', options);
}

onMounted(() => {
  store.fetchLogs();
  memberStore.fetchMembers();
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});
</script>

<template>
  <div class="bg-black text-white min-h-[calc(100vh-80px-73px)] w-full py-8 px-6 flex flex-col justify-start">
    <div class="max-w-7xl mx-auto w-full space-y-6 flex-grow flex flex-col">
      
      <!-- CONTENEDOR PRINCIPAL GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        
        <!-- IZQUIERDA: Consola de validación (Pantalla para miembros y recepción) -->
        <div class="lg:col-span-8 flex flex-col justify-between min-h-[580px] bg-neutral-950 text-white rounded-2xl border border-neutral-900 p-8 shadow-2xl relative overflow-hidden">
          
          <!-- Indicador de estatus y Reloj Digital -->
          <div>
            <div class="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span class="text-[10px] text-neutral-400 font-semibold tracking-widest uppercase font-mono">Sistema Online</span>
              </div>
              
              <!-- Horario resumido -->
              <div class="text-[10px] text-neutral-400 font-mono tracking-wider">
                Horario Hoy: Lun-Vie 8-22h | Sáb 8-12h | Dom Cerrado
              </div>
            </div>

            <!-- Digital Clock Section -->
            <div class="flex flex-col items-center justify-center py-2">
              <div class="text-5xl md:text-6xl font-mono tracking-widest text-[#EF9F27] font-bold glow-gold select-none">
                {{ timeString }}
              </div>
              <div class="text-xs text-neutral-400 uppercase font-semibold tracking-widest mt-2 font-mono">
                {{ dateString }}
              </div>
            </div>
          </div>

          <!-- Escáner y validación de perfil -->
          <div class="flex flex-col items-center justify-center flex-grow py-8">
            
            <!-- PASO 1: Estado de espera -->
            <div v-if="store.scanStep === 'waiting'" class="flex flex-col items-center space-y-6">
              <div 
                class="w-32 h-32 rounded-full border border-neutral-800 bg-neutral-900/40 flex items-center justify-center relative shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div class="text-center">
                <h3 class="text-xl font-bold tracking-wide text-white font-sans">Listo para Check-In</h3>
                <p class="text-xs text-neutral-400 mt-2 font-sans">Busque y seleccione un miembro a la derecha para registrar asistencia</p>
              </div>
            </div>

            <!-- PASO 2: Procesando registro -->
            <div v-if="store.scanStep === 'scanning'" class="flex flex-col items-center space-y-6">
              <div class="w-32 h-32 rounded-full bg-neutral-950 border-2 border-[#FA2F2A] flex items-center justify-center pulse-scan-red relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-[#FA2F2A] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div class="text-center">
                <h3 class="text-xl font-bold tracking-wide text-[#FA2F2A] animate-pulse">Procesando registro...</h3>
                <p class="text-xs text-neutral-400 mt-2 font-sans">Buscando información de asistencia</p>
              </div>
            </div>

            <!-- PASO 3: Registro Encontrado -->
            <div v-if="store.scanStep === 'matched'" class="flex flex-col items-center space-y-6">
              <div class="w-32 h-32 rounded-full bg-neutral-950 border-2 border-amber-400 flex items-center justify-center relative">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.89M9 11l3 3L22 4" />
                </svg>
              </div>
              <div class="text-center">
                <h3 class="text-xl font-bold tracking-wide text-amber-400 font-sans">Registro Encontrado</h3>
                <p class="text-xs text-neutral-400 mt-2 font-sans">Validando vigencia de membresía...</p>
              </div>
            </div>

            <!-- PASO 4: Resultados del Acceso -->
            <div v-if="store.scanStep === 'result' && store.activeResult" class="w-full max-w-xl">
              
              <!-- CASO A: Acceso Concedido (Éxito) -->
              <div v-if="store.activeResult.accessGranted" class="flex flex-col items-center space-y-6">
                
                <div class="w-24 h-24 rounded-full bg-emerald-950/40 border-4 border-emerald-500 flex items-center justify-center pulse-scan-green">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <!-- Detalles del Miembro -->
                <div class="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center space-x-6">
                  <img 
                    :src="getMemberAvatarUrl(store.activeResult)" 
                    alt="Foto de Miembro" 
                    class="w-24 h-24 rounded-xl object-cover object-center bg-neutral-950 border border-neutral-700" 
                  />
                  <div class="flex-grow space-y-1">
                    <span class="bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded">ACCESO CONCEDIDO</span>
                    <h4 class="text-2xl font-bold text-white pt-2">¡Bienvenido, {{ store.activeResult.memberName }}!</h4>
                    <div class="text-sm text-neutral-400">Número de Miembro: {{ store.activeResult.memberNumber }}</div>
                    <div class="text-sm text-neutral-400">
                      Plan: <span class="text-white font-medium">{{ store.activeResult.membershipType }}</span>
                    </div>
                    <div class="text-xs text-neutral-500 pt-1 font-mono">
                      Vence el: {{ store.activeResult.membershipEndDate }}
                    </div>
                  </div>
                </div>

                <div class="text-center pt-2 flex flex-col items-center space-y-2">
                  <button @click="store.resetScanner()" class="text-xs text-neutral-400 hover:text-white underline underline-offset-4 font-sans cursor-pointer">
                    Siguiente Registro
                  </button>
                  <p class="text-[10px] text-neutral-500 font-mono">La consola se restablecerá automáticamente en 40s</p>
                </div>
              </div>

              <!-- CASO B: Acceso Denegado (Vencido / Desconocido) -->
              <div v-else class="flex flex-col items-center space-y-6">
                <div class="w-24 h-24 rounded-full bg-red-950/40 border-4 border-red-500 flex items-center justify-center animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <div class="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
                  <div>
                    <span class="bg-red-500/15 text-red-400 text-xs font-semibold px-2.5 py-1 rounded">ACCESO DENEGADO</span>
                  </div>
                  <div class="space-y-1">
                    <h4 class="text-xl font-bold text-white">
                      {{ store.activeResult.memberName || 'Folio Desconocido' }}
                    </h4>
                    <p class="text-sm text-red-400 font-semibold uppercase tracking-wider mt-1 font-sans">
                      {{ store.activeResult.failureReason === 'MEMBRESIA_EXPIRADA' ? 'Membresía Vencida' : 'Folio no Encontrado o Inválido' }}
                    </p>
                    <p class="text-xs text-neutral-400 px-4 pt-1 font-sans">
                      {{ store.activeResult.failureReason === 'MEMBRESIA_EXPIRADA' 
                        ? `El plan de este miembro ha expirado. Favor de renovar en recepción.` 
                        : 'No logramos asociar este folio con un miembro del gimnasio.' }}
                    </p>
                  </div>
                </div>

                <div class="text-center pt-2 flex flex-col items-center space-y-2">
                  <button @click="store.resetScanner()" class="text-xs text-neutral-400 hover:text-white underline underline-offset-4 font-sans cursor-pointer">
                    Restablecer Consola
                  </button>
                  <p class="text-[10px] text-neutral-500 font-mono">La consola se restablecerá automáticamente en 40s</p>
                </div>
              </div>

            </div>

          </div>

          <div class="border-t border-neutral-900 pt-4 text-center text-[10px] text-neutral-600 font-mono">
            Consola de Registro de Asistencia • Estado: Activo
          </div>
        </div>

        <!-- DERECHA: Controles del Simulador e Historial -->
        <div class="lg:col-span-4 space-y-6 flex flex-col">
          
          <!-- Tarjeta de Controles de Registro Manual -->
          <div v-if="authStore.hasPermission('manage:access') && authStore.userRole !== 'clock'" class="p-6 bg-neutral-950 border border-neutral-900 rounded-2xl shadow-xl space-y-4">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Asistencia Manual</h3>
            
            <div class="space-y-4 pt-1">
              <!-- Buscador de Miembros para Registro Manual -->
              <div class="space-y-2 relative">
                <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">Buscar Miembro (Nombre, Apellido, Folio)</label>
                <div class="relative">
                  <input 
                    v-model="manualSearchQuery" 
                    type="text" 
                    placeholder="Escribe para buscar..." 
                    @focus="showSearchResults = true"
                    class="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#EF9F27]"
                  />
                  <!-- Clear button -->
                  <button 
                    v-if="manualSearchQuery" 
                    type="button" 
                    @click="clearManualSearch" 
                    class="absolute right-3 top-2.5 text-neutral-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <!-- Search Results Dropdown -->
                <div v-if="showSearchResults && filteredMembers.length > 0" class="absolute z-20 w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in slide-in-from-top-1 duration-150">
                  <div 
                    v-for="m in filteredMembers" 
                    :key="m.id" 
                    @click="selectManualMember(m)" 
                    class="px-3 py-2 text-xs hover:bg-neutral-800 cursor-pointer border-b border-neutral-800/50 last:border-0 flex justify-between items-center text-white"
                  >
                    <span>{{ m.firstName }} {{ m.lastName }}</span>
                    <span class="text-[10px] text-neutral-500 font-mono">{{ m.memberNumber }}</span>
                  </div>
                </div>
              </div>

              <button 
                @click="store.triggerSimulatedScan(selectedSimMemberId)"
                :disabled="!selectedSimMemberId || store.isScanning"
                class="w-full py-2.5 bg-[#EF9F27] hover:bg-[#d97706] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{{ store.isScanning ? 'Verificando...' : 'Registrar Entrada Manual' }}</span>
              </button>


            </div>
          </div>

          <!-- Horario del Gimnasio -->
          <div class="p-6 bg-neutral-950 border border-neutral-900 rounded-2xl shadow-xl space-y-4">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Horario del Gimnasio</h3>
            <div class="space-y-2.5 text-sm text-neutral-300 font-mono">
              <div class="flex justify-between border-b border-neutral-900 pb-1.5">
                <span>Lunes - Viernes:</span>
                <span class="text-[#FA2F2A] font-bold">07:00 - 22:00</span>
              </div>
              <div class="flex justify-between border-b border-neutral-900 pb-1.5">
                <span>Sábado:</span>
                <span class="text-white font-bold">08:00 - 12:00</span>
              </div>
              <div class="flex justify-between">
                <span>Domingo:</span>
                <span class="text-neutral-500 font-bold uppercase">Cerrado</span>
              </div>
            </div>
          </div>

          <!-- Historial de accesos -->
          <div v-if="authStore.userRole !== 'clock'" class="p-6 bg-neutral-950 border border-neutral-900 rounded-2xl shadow-xl max-h-[350px] overflow-y-auto flex-grow flex flex-col">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">Entradas de Hoy</h3>
            
            <div class="space-y-4 overflow-y-auto flex-grow pr-1">
              <div 
                v-for="log in store.logs" 
                :key="log.id" 
                class="flex items-center space-x-3 text-xs border-b border-neutral-900 pb-3 last:border-0"
              >
                <div 
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="log.accessGranted ? 'bg-emerald-500' : 'bg-red-500'"
                ></div>
                <div class="flex-grow">
                  <button
                    type="button"
                    @click="openMemberProfile(log.memberId)"
                    class="font-semibold text-white hover:text-[#EF9F27] hover:underline underline-offset-2 text-left cursor-pointer transition-colors"
                  >
                    {{ log.memberName }}
                  </button>
                  <p class="text-[10px] text-neutral-400 font-mono">
                    {{ new Date(log.scannedAt).toLocaleTimeString() }} • {{ log.memberNumber }}
                  </p>
                </div>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-semibold font-mono"
                  :class="log.accessGranted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'"
                >
                  {{ log.accessGranted ? 'ENTRA' : 'RECHAZADO' }}
                </span>
              </div>
              
              <p v-if="store.logs.length === 0" class="text-center text-xs text-neutral-500 py-6 font-mono">
                No se han registrado accesos hoy.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.glow-gold {
  text-shadow: 0 0 10px rgba(239, 159, 39, 0.55), 0 0 20px rgba(239, 159, 39, 0.2);
}
</style>
