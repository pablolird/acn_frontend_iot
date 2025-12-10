<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next';

interface Props {
  type: 'intruder' | 'fire';
  time: string;
  isActive: boolean;
}

const props = defineProps<Props>();
defineEmits<{
  (e: 'dismiss'): void;
}>();

const config = {
  intruder: {
    color: 'red',
    title: 'Intruder Detected!',
    icon: AlertTriangle
  },
  fire: {
    color: 'orange',
    title: 'Fire Detected!',
    icon: AlertTriangle
  }
};

const currentConfig = config[props.type];
</script>

<template>
  <div class="mb-6 animate-pulse">
    <div 
      :class="[
        `bg-${currentConfig.color}-900/30`,
        `border-${currentConfig.color}-500`,
        'border-2 p-4 rounded-lg relative'
      ]"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-start gap-4">
          <component 
            :is="currentConfig.icon" 
            :class="`h-6 w-6 text-${currentConfig.color}-500 mt-0.5`" 
          />
          <div>
            <h5 :class="`text-${currentConfig.color}-400 text-lg font-bold`">
              {{ currentConfig.title }}
            </h5>
            <div :class="`text-${currentConfig.color}-300 mt-1`">
              {{ type === 'intruder' ? 'Security breach' : 'Fire' }} detected at {{ time }}.
              {{ isActive ? 'Alert is currently active.' : 'Alert has been cleared.' }}
            </div>
          </div>
        </div>
        <button
          @click="$emit('dismiss')"
          :class="[
            `text-${currentConfig.color}-400`,
            `hover:text-${currentConfig.color}-300`,
            `hover:bg-${currentConfig.color}-900/50`,
            'p-1 rounded transition-colors'
          ]"
          aria-label="Dismiss alert"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
</template>
