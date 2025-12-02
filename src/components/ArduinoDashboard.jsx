import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Sun, Volume2, Wifi, WifiOff, AlertTriangle, X, Gamepad2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_DATA_POINTS = 30;

const SensorCard = ({ icon: Icon, title, value, unit, color }) => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl transition duration-300 hover:border-blue-500/50">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-gray-400 text-sm font-medium">{title}</span>
      </div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-4xl font-extrabold text-white">
        {value !== null && value !== undefined ? value.toFixed(1) : '--'}
      </span>
      <span className="text-gray-500 text-xl">{unit}</span>
    </div>
  </div>
);

const SensorChart = ({ data, dataKey, title, color, unit, yDomain }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl">
      <h3 className="text-white font-semibold mb-4 text-lg">
        {title} <span className="text-gray-500 text-sm">({data.length} points)</span>
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#6B7280"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            tickFormatter={(value) => value}
            minTickGap={10}
          />
          <YAxis 
            stroke="#6B7280"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            domain={yDomain || ['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px'
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value) => [`${value.toFixed(1)} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function ArduinoDashboard({ onNavigateToGame }) {
  const [currentData, setCurrentData] = useState({
    temperature_c: null,
    humidity: null,
    brightness: null,
    sound: null,
    intruder: false,
    fire: false
  });

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [debugLog, setDebugLog] = useState([]);
  const [showIntruderAlert, setShowIntruderAlert] = useState(false);
  const [intruderDetectedTime, setIntruderDetectedTime] = useState(null);
  const [showFireAlert, setShowFireAlert] = useState(false);
  const [fireDetectedTime, setFireDetectedTime] = useState(null);

  const dataBufferRef = useRef({
    temperature: [],
    humidity: [],
    brightness: [],
    sound: []
  });

  const [chartData, setChartData] = useState({
    temperature: [],
    humidity: [],
    brightness: [],
    sound: []
  });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageCountRef = useRef(0);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    setDebugLog(prev => {
      const newLog = [...prev.slice(-9), `[${timestamp}] ${message}`];
      return newLog;
    });
  };

  const connectWebSocket = () => {
    try {
      addLog('Attempting to connect to ws://10.42.0.225:8000/ws');
      const ws = new WebSocket('ws://10.42.0.225:8000/ws');
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        addLog('✅ WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        messageCountRef.current += 1;
        
        try {
          const data = JSON.parse(event.data);
          addLog(`📩 Message #${messageCountRef.current} received`);
          
          if (data.intruder === true && currentData.intruder === false) {
            setShowIntruderAlert(true);
            setIntruderDetectedTime(new Date().toLocaleTimeString());
            addLog('🚨 INTRUDER DETECTED!');
          }
          
          if (data.fire === true && currentData.fire === false) {
            setShowFireAlert(true);
            setFireDetectedTime(new Date().toLocaleTimeString());
            addLog('🔥 FIRE DETECTED!');
          }
          
          setCurrentData(data);

          const now = new Date();
          const timeLabel = now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');

          const buffers = dataBufferRef.current;
          
          const updateBuffer = (buffer, key, value) => {
            if (value !== null && value !== undefined) {
              buffer.push({ time: timeLabel, value: value });
              if (buffer.length > MAX_DATA_POINTS) {
                buffer.shift();
              }
            }
          };

          updateBuffer(buffers.temperature, 'temperature', data.temperature_c);
          updateBuffer(buffers.humidity, 'humidity', data.humidity);
          updateBuffer(buffers.brightness, 'brightness', data.brightness);
          updateBuffer(buffers.sound, 'sound', data.sound);

        } catch (error) {
          addLog(`❌ Error parsing message: ${error.message}`);
        }
      };

      ws.onerror = (error) => {
        setConnectionStatus('error');
        addLog(`❌ WebSocket error: Check backend server status.`);
      };

      ws.onclose = (event) => {
        setConnectionStatus('disconnected');
        addLog(`⚠️ WebSocket closed (code: ${event.code}). Reconnecting in 2s...`);
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      wsRef.current = ws;
    } catch (error) {
      addLog(`❌ Connection setup failed: ${error.message}`);
      setConnectionStatus('error');
      if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setChartData({
        temperature: [...dataBufferRef.current.temperature],
        humidity: [...dataBufferRef.current.humidity],
        brightness: [...dataBufferRef.current.brightness],
        sound: [...dataBufferRef.current.sound]
      });
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    addLog('🚀 Dashboard mounted');
    connectWebSocket();

    return () => {
      addLog('🔴 Dashboard unmounting');
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmount");
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-gray-700">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 sm:mb-0">
            Arduino Sensor Dashboard
          </h1>
          <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-full shadow-inner">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-6 h-6 text-green-400 animate-pulse" />
              ) : (
                <WifiOff className="w-6 h-6 text-red-400" />
              )}
              <span className={`text-md font-bold ${
                connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'
              }`}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {showIntruderAlert && (
          <div className="mb-6 animate-in fade-in slide-in-from-top duration-300">
            <Alert className="bg-red-900/30 border-red-500 border-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-10 w-full h-full">
                  <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5 animate-pulse" />
                  <div className='w-lg'>
                    <AlertTitle className="text-red-400 text-lg w-lg font-bold">
                      Intruder Detected!
                    </AlertTitle>
                    <AlertDescription className="text-red-300 mt-1">
                      Security breach detected at {intruderDetectedTime}. 
                      {currentData.intruder ? ' Alert is currently active.' : ' Alert has been cleared.'}
                    </AlertDescription>
                  </div>
                </div>
                <button
                  onClick={() => setShowIntruderAlert(false)}
                  className="text-red-400 hover:text-red-300 w-lg transition-colors p-1 rounded hover:bg-red-900/50"
                  aria-label="Dismiss alert"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </Alert>
          </div>
        )}

        {showFireAlert && (
          <div className="mb-6 animate-in fade-in slide-in-from-top duration-300">
            <Alert className="bg-orange-900/30 border-orange-500 border-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-10 w-full h-full">
                  <AlertTriangle className="h-6 w-6 text-orange-500 mt-0.5 animate-pulse" />
                  <div className='w-lg'>
                    <AlertTitle className="text-orange-400 text-lg w-lg font-bold">
                      Fire Detected!
                    </AlertTitle>
                    <AlertDescription className="text-orange-300 mt-1">
                      Fire detected at {fireDetectedTime}. 
                      {currentData.fire ? ' Alert is currently active.' : ' Alert has been cleared.'}
                    </AlertDescription>
                  </div>
                </div>
                <button
                  onClick={() => setShowFireAlert(false)}
                  className="text-orange-400 hover:text-orange-300 w-lg transition-colors p-1 rounded hover:bg-orange-900/50"
                  aria-label="Dismiss alert"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SensorCard
            icon={Thermometer}
            title="Temperature"
            value={currentData.temperature_c}
            unit="°C"
            color="text-red-400"
          />
          <SensorCard
            icon={Droplets}
            title="Humidity"
            value={currentData.humidity}
            unit="%"
            color="text-blue-400"
          />
          <SensorCard
            icon={Sun}
            title="Brightness"
            value={currentData.brightness}
            unit="lux"
            color="text-yellow-400"
          />
          <SensorCard
            icon={Volume2}
            title="Sound"
            value={currentData.sound}
            unit="%"
            color="text-purple-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SensorChart
            data={chartData.temperature}
            dataKey="value"
            title="Temperature Over Time"
            color="#F87171"
            unit="°C"
            yDomain={[-50, 50]}
          />
          <SensorChart
            data={chartData.humidity}
            dataKey="value"
            title="Humidity Over Time"
            color="#60A5FA"
            unit="%"
            yDomain={[0, 100]}
          />
          <SensorChart
            data={chartData.brightness}
            dataKey="value"
            title="Brightness Over Time"
            color="#FBBF24"
            unit="lux"
            yDomain={[0, 100]}
          />
          <SensorChart
            data={chartData.sound}
            dataKey="value"
            title="Sound Level Over Time"
            color="#A78BFA"
            unit="%"
            yDomain={[0, 100]}
          />
        </div>

        {/* Game Section */}
        <div className="mt-12 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-8 border border-purple-500/30">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="flex items-center gap-4">
              <Gamepad2 className="w-12 h-12 text-purple-400" />
              <h2 className="text-3xl font-bold text-white">Ready to Play?</h2>
            </div>
            <p className="text-gray-300 text-center max-w-2xl">
              Test your reflexes with the Dino Jump game! Use your joystick button to make the dinosaur jump over obstacles. 
              How long can you survive?
            </p>
            <button
              onClick={onNavigateToGame}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}