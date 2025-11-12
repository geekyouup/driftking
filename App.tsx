import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import { Track, GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const handleStartGame = (track: Track) => {
    setSelectedTrack(track);
    setGameState(GameState.PLAYING);
  };

  const handleExitGame = () => {
    setGameState(GameState.MENU);
    setSelectedTrack(null);
  };

  return (
    <div className="w-screen h-screen bg-neutral-950 flex items-center justify-center overflow-hidden">
      {gameState === GameState.MENU && (
        <MainMenu onSelectTrack={handleStartGame} />
      )}
      
      {gameState === GameState.PLAYING && selectedTrack && (
        <GameCanvas track={selectedTrack} onExit={handleExitGame} />
      )}
    </div>
  );
};

export default App;
