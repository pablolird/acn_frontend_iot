import { useState } from 'react';
import ArduinoDashboard from './components/ArduinoDashboard';
import DinoGame from './components/DinoGame';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div>
      {currentPage === 'dashboard' && (
        <ArduinoDashboard onNavigateToGame={() => setCurrentPage('game')} />
      )}
      {currentPage === 'game' && (
        <DinoGame onNavigateToDashboard={() => setCurrentPage('dashboard')} />
      )}
    </div>
  );
}

export default App;