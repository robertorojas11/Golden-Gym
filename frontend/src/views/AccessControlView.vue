<script setup lang="ts">
import { onMounted } from 'vue';
import { useBiometricStore } from '../stores/biometric.store';

const store = useBiometricStore();

onMounted(() => {
  store.fetchLogs();
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- IZQUIERDA: Consola de validación (Pantalla para miembros y recepción) -->
      <div class="lg:col-span-8 flex flex-col justify-between min-h-[580px] bg-black text-white rounded-2xl border border-neutral-800 p-8 shadow-2xl relative overflow-hidden">
        
        <!-- Indicador de estatus -->
        <div class="absolute top-6 left-6 flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="text-xs text-neutral-400 font-semibold tracking-widest uppercase">Sistema en Línea (Local)</span>
        </div>

        <div class="absolute top-6 right-6 font-mono text-sm text-neutral-500">
          {{ new Date().toLocaleDateString() }}
        </div>

        <!-- Escáner y validación de perfil -->
        <div class="flex flex-col items-center justify-center flex-grow py-12">
          
          <!-- PASO 1: Estado de espera -->
          <div v-if="store.scanStep === 'waiting'" class="flex flex-col items-center space-y-6">
            <div 
              @click="store.triggerSimulatedScan()"
              class="w-32 h-32 rounded-full border border-neutral-700 bg-neutral-900 flex items-center justify-center cursor-pointer hover:border-red-500 hover:bg-neutral-950 transition-all duration-300 shadow-lg group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-neutral-400 group-hover:text-[#FA2F2A] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a14 14 0 00-6-11.796m22.348 11.796c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 0019 11a14 14 0 00-6-11.796m-.75-3.47a12 12 0 10-1.5 0" />
              </svg>
            </div>
            <div class="text-center">
              <h3 class="text-xl font-bold tracking-wide">Listo para Verificación</h3>
              <p class="text-xs text-neutral-400 mt-2">Coloque su huella en el lector para registrar su entrada</p>
            </div>
          </div>

          <!-- PASO 2: Escaneando huella -->
          <div v-if="store.scanStep === 'scanning'" class="flex flex-col items-center space-y-6">
            <div class="w-32 h-32 rounded-full bg-neutral-900 border-2 border-[#FA2F2A] flex items-center justify-center pulse-scan-red relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-[#FA2F2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a14 14 0 00-6-11.796m22.348 11.796c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 0019 11a14 14 0 00-6-11.796m-.75-3.47a12 12 0 10-1.5 0" />
              </svg>
            </div>
            <div class="text-center">
              <h3 class="text-xl font-bold tracking-wide text-[#FA2F2A] animate-pulse">Escaneando huella digital...</h3>
              <p class="text-xs text-neutral-400 mt-2">Capturando patrón biométrico</p>
            </div>
          </div>

          <!-- PASO 3: Huella reconocida -->
          <div v-if="store.scanStep === 'matched'" class="flex flex-col items-center space-y-6">
            <div class="w-32 h-32 rounded-full bg-neutral-950 border-2 border-amber-400 flex items-center justify-center relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.89M9 11l3 3L22 4" />
              </svg>
            </div>
            <div class="text-center">
              <h3 class="text-xl font-bold tracking-wide text-amber-400">Huella Digital Reconocida</h3>
              <p class="text-xs text-neutral-400 mt-2">Buscando registro de membresía...</p>
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
                  :src="store.activeResult.photoUrl || ''" 
                  alt="Foto de Miembro" 
                  class="w-24 h-24 rounded-xl object-cover bg-neutral-950 border border-neutral-700" 
                />
                <div class="flex-grow space-y-1">
                  <span class="bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded">ACCESO CONCEDIDO</span>
                  <h4 class="text-2xl font-bold text-white pt-2">¡Bienvenido, {{ store.activeResult.memberName }}!</h4>
                  <div class="text-sm text-neutral-400">Número de Miembro: {{ store.activeResult.memberNumber }}</div>
                  <div class="text-sm text-neutral-400">
                    Plan: <span class="text-white font-medium">{{ store.activeResult.membershipType }}</span>
                  </div>
                  <div class="text-xs text-neutral-500 pt-1">
                    Vence el: {{ store.activeResult.membershipEndDate }}
                  </div>
                </div>
              </div>

              <div class="text-center pt-2">
                <button @click="store.resetScanner()" class="text-sm text-neutral-400 hover:text-white underline underline-offset-4">
                  Volver a escanear
                </button>
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
                    {{ store.activeResult.memberName || 'Usuario Desconocido' }}
                  </h4>
                  <p class="text-sm text-red-400 font-semibold uppercase tracking-wider mt-1">
                    {{ store.activeResult.failureReason === 'MEMBRESIA_EXPIRADA' ? 'Membresía Vencida' : 'Huella no Encontrada o Rechazada' }}
                  </p>
                  <p class="text-xs text-neutral-400 px-4 pt-1">
                    {{ store.activeResult.failureReason === 'MEMBRESIA_EXPIRADA' 
                      ? `Tu plan ha expirado. Favor de acudir al mostrador de recepción para renovar tu acceso.` 
                      : 'No logramos asociar esta huella con un miembro activo del gimnasio.' }}
                  </p>
                </div>
              </div>

              <div class="text-center pt-2">
                <button @click="store.resetScanner()" class="text-sm text-neutral-400 hover:text-white underline underline-offset-4">
                  Reiniciar alarma y reintentar
                </button>
              </div>
            </div>

          </div>

        </div>

        <div class="border-t border-neutral-900 pt-4 text-center text-xs text-neutral-600 font-mono">
          Bucle de Simulación de Lector Biométrico Activo • Estatus: Correcto
        </div>
      </div>

      <!-- DERECHA: Controles del Simulador e Historial -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- Tarjeta de Controles del simulador -->
        <div class="premium-card p-6 bg-white">
          <h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-4">Simulador Biométrico</h3>
          
          <div class="space-y-3">
            <button 
              @click="store.triggerSimulatedScan('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001')"
              class="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between transition-all group"
            >
              <div>
                <p class="text-sm font-semibold text-neutral-800">Simular Entrada (Roberto)</p>
                <p class="text-xs text-neutral-400">Verifica membresía activa en MXN</p>
              </div>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-all"></span>
            </button>

            <button 
              @click="store.triggerSimulatedScan('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003')"
              class="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between transition-all group"
            >
              <div>
                <p class="text-sm font-semibold text-neutral-800">Simular Entrada (Juan Pérez)</p>
                <p class="text-xs text-neutral-400">Planes diarios vencidos</p>
              </div>
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 group-hover:scale-125 transition-all"></span>
            </button>

            <button 
              @click="store.triggerSimulatedScan(undefined, 'denied_unknown')"
              class="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between transition-all group"
            >
              <div>
                <p class="text-sm font-semibold text-neutral-800">Simular Huella Desconocida</p>
                <p class="text-xs text-neutral-400">Sin correspondencia biométrica</p>
              </div>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 group-hover:scale-125 transition-all"></span>
            </button>
          </div>
        </div>

        <!-- Historial de accesos -->
        <div class="premium-card p-6 bg-white max-h-[350px] overflow-y-auto">
          <h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-4">Entradas de Hoy</h3>
          
          <div class="space-y-4">
            <div 
              v-for="log in store.logs" 
              :key="log.id" 
              class="flex items-center space-x-3 text-xs border-b border-neutral-100 pb-3 last:border-0"
            >
              <div 
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="log.accessGranted ? 'bg-emerald-500' : 'bg-red-500'"
              ></div>
              <div class="flex-grow">
                <p class="font-semibold text-neutral-800">{{ log.memberName }}</p>
                <p class="text-[10px] text-neutral-400 font-mono">
                  {{ new Date(log.scannedAt).toLocaleTimeString() }} • {{ log.memberNumber }}
                </p>
              </div>
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-semibold"
                :class="log.accessGranted ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'"
              >
                {{ log.accessGranted ? 'ENTRA' : 'RECHAZADO' }}
              </span>
            </div>
            
            <p v-if="store.logs.length === 0" class="text-center text-xs text-neutral-400 py-6">
              No se han registrado accesos hoy.
            </p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
