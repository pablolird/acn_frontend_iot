<script setup lang="ts">
import { Thermometer, Droplets, Sun, Volume2 } from 'lucide-vue-next';

interface SensorCardsProps {
  temperature: number;
  humidity: number;
  brightness: number;
  sound: number;
}

defineProps<SensorCardsProps>();

const sensors = [
  {
    type: 'temperature',
    icon: Thermometer,
    label: 'Temperature',
    unit: '°C',
    color: 'from-orange-500 to-red-500'
  },
  {
    type: 'humidity',
    icon: Droplets,
    label: 'Humidity',
    unit: '%',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    type: 'brightness',
    icon: Sun,
    label: 'Brightness',
    unit: 'lux',
    color: 'from-yellow-500 to-amber-500'
  },
  {
    type: 'sound',
    icon: Volume2,
    label: 'Sound',
    unit: '%',
    color: 'from-purple-500 to-pink-500'
  }
];

// Helper to get value dynamically based on prop name matching the type
function getValue(props: SensorCardsProps, type: string): string {
  const val = props[type as keyof SensorCardsProps];
  return type === 'brightness' ? val.toFixed(0) : val.toFixed(1);
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div 
      v-for="sensor in sensors" 
      :key="sensor.label"
      class="bg-sky-400/10 backdrop-blur-md rounded-xl border border-sky-300/20 p-6 hover:bg-sky-400/15 transition-all duration-300"
    >
      <div class="flex items-center justify-between mb-4">
        <div :class="`p-3 rounded-lg bg-gradient-to-br ${sensor.color}`">
          <component :is="sensor.icon" class="w-6 h-6 text-white" />
        </div>
      </div>
      <div class="space-y-1">
        <p class="text-sky-300 text-sm">{{ sensor.label }}</p>
        <p class="text-sky-50 text-3xl">
          {{ getValue($props, sensor.type) }}
          <span class="text-lg ml-1 text-sky-300">{{ sensor.unit }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
