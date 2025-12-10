import { ref, onUnmounted } from 'vue';

const MAX_DATA_POINTS = 30;

interface SensorData {
    temperature: number;
    humidity: number;
    brightness: number;
    sound: number;
    intruder: boolean;
    fire: boolean;
}

interface ChartDataPoint {
    time: string;
    value: number;
}

// Global state
const connectionStatus = ref<'connected' | 'disconnected' | 'error'>('disconnected');
const sensorData = ref<SensorData>({
    temperature: 0,
    humidity: 0,
    brightness: 0,
    sound: 0,
    intruder: false,
    fire: false
});
const alerts = ref<{ intruder: { active: boolean; time: string }; fire: { active: boolean; time: string } }>({
    intruder: { active: false, time: '' },
    fire: { active: false, time: '' }
});
const joystickPressed = ref(false);

const chartData = ref<{
    temperature: ChartDataPoint[];
    humidity: ChartDataPoint[];
    brightness: ChartDataPoint[];
    sound: ChartDataPoint[];
}>({
    temperature: [],
    humidity: [],
    brightness: [],
    sound: []
});

let ws: WebSocket | null = null;
let reconnectTimeout: number | undefined;

export function useWebSocket() {
    const connect = () => {
        try {
            console.log('Connecting to WebSocket...');
            ws = new WebSocket('ws://10.42.0.225:8000/ws');

            ws.onopen = () => {
                connectionStatus.value = 'connected';
                console.log('✅ WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle Joystick Button
                    if (data.type === 'joystick_button') {
                        if (data.pressed === true) {
                            joystickPressed.value = true;
                            // Reset trigger after a frame to allow re-triggering (handled by consumer usually, but we toggle it here for safety)
                            setTimeout(() => { joystickPressed.value = false; }, 100);
                        }
                        return;
                    }

                    // Handle Alerts
                    if (data.intruder === true && sensorData.value.intruder === false) {
                        alerts.value.intruder = { active: true, time: new Date().toLocaleTimeString() };
                    }
                    if (data.fire === true && sensorData.value.fire === false) {
                        alerts.value.fire = { active: true, time: new Date().toLocaleTimeString() };
                    }

                    // Update Current Data
                    sensorData.value = {
                        temperature: data.temperature_c ?? 0,
                        humidity: data.humidity ?? 0,
                        brightness: data.brightness ?? 0,
                        sound: data.sound ?? 0,
                        intruder: data.intruder ?? false,
                        fire: data.fire ?? false
                    };

                    // Update Charts
                    const now = new Date();
                    const timeLabel = now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');

                    const updateSeries = (series: ChartDataPoint[], val: number | null | undefined) => {
                        if (val === null || val === undefined) return series;
                        const newSeries = [...series, { time: timeLabel, value: val }];
                        return newSeries.slice(-MAX_DATA_POINTS);
                    };

                    chartData.value = {
                        temperature: updateSeries(chartData.value.temperature, data.temperature_c),
                        humidity: updateSeries(chartData.value.humidity, data.humidity),
                        brightness: updateSeries(chartData.value.brightness, data.brightness),
                        sound: updateSeries(chartData.value.sound, data.sound)
                    };

                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            ws.onerror = () => {
                connectionStatus.value = 'error';
            };

            ws.onclose = () => {
                connectionStatus.value = 'disconnected';
                if (reconnectTimeout) clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(connect, 2000);
            };

        } catch (error) {
            console.error('Connection failed:', error);
            connectionStatus.value = 'error';
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, 2000);
        }
    };

    const close = () => {
        if (ws) ws.close();
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };

    return {
        connect,
        close,
        connectionStatus,
        sensorData,
        chartData,
        alerts,
        joystickPressed
    };
}
