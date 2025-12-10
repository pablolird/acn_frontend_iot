<script setup lang="ts">
import { computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartDataPoint {
  time: string;
  value: number;
}

interface RealTimeChartsProps {
  temperatureData: ChartDataPoint[];
  humidityData: ChartDataPoint[];
  brightnessData: ChartDataPoint[];
  soundData: ChartDataPoint[];
}

const props = defineProps<RealTimeChartsProps>();

// Chart options configuration
const getOptions = (unit: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      grid: {
        color: 'rgba(125, 211, 252, 0.15)'
      },
      ticks: {
        color: 'rgba(186, 230, 253, 0.8)'
      },
      border: {
        display: false
      }
    },
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: 'rgba(186, 230, 253, 0.8)'
      },
      border: {
        display: false
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      titleColor: '#e0f2fe',
      bodyColor: '#e0f2fe',
      borderColor: 'rgba(125, 211, 252, 0.3)',
      borderWidth: 1,
      padding: 10,
      callbacks: {
        label: (context: any) => `${context.parsed.y.toFixed(2)} ${unit}`
      }
    }
  }
});

const charts = computed(() => [
  {
    title: 'Temperature',
    data: props.temperatureData,
    color: '#f97316',
    unit: '°C'
  },
  {
    title: 'Humidity',
    data: props.humidityData,
    color: '#06b6d4',
    unit: '%'
  },
  {
    title: 'Brightness',
    data: props.brightnessData,
    color: '#eab308',
    unit: 'lux'
  },
  {
    title: 'Sound Level',
    data: props.soundData,
    color: '#a855f7',
    unit: '%'
  }
]);

// Helper to format data for Chart.js
const getChartData = (data: ChartDataPoint[], color: string) => ({
  labels: data.map(d => d.time),
  datasets: [
    {
      data: data.map(d => d.value),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4
    }
  ]
});
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div 
      v-for="chart in charts" 
      :key="chart.title"
      class="bg-sky-400/10 backdrop-blur-md rounded-xl border border-sky-300/20 p-6"
    >
      <h3 class="text-sky-100 text-xl mb-4">{{ chart.title }} Over Time</h3>
      <div class="h-[250px] w-full">
        <Line 
          :data="getChartData(chart.data, chart.color)" 
          :options="getOptions(chart.unit)" 
        />
      </div>
    </div>
  </div>
</template>
