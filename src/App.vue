<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import SensorCards from './components/SensorCards.vue';
import RealTimeCharts from './components/RealTimeCharts.vue';
import DinoGame from './components/DinoGame.vue';
import AlertBanner from './components/AlertBanner.vue';
import { useWebSocket } from './composables/useWebSocket';

// WebSocket Composable
const { 
  connect, 
  close, 
  connectionStatus, 
  sensorData, 
  chartData, 
  alerts, 
  joystickPressed 
} = useWebSocket();

// Refs
const dinoGameRef = ref<InstanceType<typeof DinoGame> | null>(null);

// Watchers
watch(joystickPressed, (pressed) => {
  if (pressed && dinoGameRef.value) {
    dinoGameRef.value.handleGameAction();
  }
});

onMounted(() => {
  connect();
});

onUnmounted(() => {
  close();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-sky-900 to-slate-800 p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-sky-100 text-4xl">Server security system</h1>
        <div class="flex items-center gap-3 bg-sky-400/10 backdrop-blur-md px-6 py-3 rounded-xl border border-sky-300/20">
          <div :class="`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`" />
          <span class="text-sky-100">
            {{ connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="alerts.intruder.active || alerts.fire.active" class="animate-in fade-in slide-in-from-top duration-300">
        <AlertBanner 
          v-if="alerts.intruder.active" 
          type="intruder" 
          :time="alerts.intruder.time" 
          :is-active="sensorData.intruder"
          @dismiss="alerts.intruder.active = false"
        />
        <AlertBanner 
          v-if="alerts.fire.active" 
          type="fire" 
          :time="alerts.fire.time" 
          :is-active="sensorData.fire"
          @dismiss="alerts.fire.active = false"
        />
      </div>

      <!-- Sensor Cards -->
      <SensorCards 
        :temperature="sensorData.temperature"
        :humidity="sensorData.humidity"
        :brightness="sensorData.brightness"
        :sound="sensorData.sound"
      />

      <!-- Real-time Charts -->
      <RealTimeCharts 
        :temperatureData="chartData.temperature"
        :humidityData="chartData.humidity"
        :brightnessData="chartData.brightness"
        :soundData="chartData.sound"
      />

      <!-- Mini Game -->
      <div class="bg-sky-400/10 backdrop-blur-md rounded-xl border border-sky-300/20 p-6">
        <h2 class="text-sky-100 text-2xl mb-4">Mini Game</h2>
        <DinoGame ref="dinoGameRef" />
      </div>
    </div>
  </div>
</template>
