import React from 'react';
import { TRACKS } from '../constants';
import { Track } from '../types';

interface MainMenuProps {
  onSelectTrack: (track: Track) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectTrack }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-10 bg-opacity-95">
      <h1 className="text-6xl font-black italic tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
        DRIFT KING
      </h1>
      <p className="text-gray-400 mb-12 text-lg tracking-wide">TOP-DOWN SIMULATION</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-8">
        {TRACKS.map((track) => (
          <button
            key={track.id}
            onClick={() => onSelectTrack(track)}
            className="group relative overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 hover:border-yellow-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(250,204,21,0.3)]"
          >
            <div className="h-32 w-full bg-gray-700 relative">
              {/* Mini map visualization */}
              <svg className="w-full h-full p-4" viewBox="0 0 1024 768">
                {track.outerWalls.map((w, i) => (
                  <line key={`out-${i}`} x1={w.p1.x} y1={w.p1.y} x2={w.p2.x} y2={w.p2.y} stroke="#4b5563" strokeWidth="10" />
                ))}
                {track.innerWalls.map((w, i) => (
                  <line key={`in-${i}`} x1={w.p1.x} y1={w.p1.y} x2={w.p2.x} y2={w.p2.y} stroke="#4b5563" strokeWidth="10" />
                ))}
              </svg>
            </div>
            <div className="p-6 text-left">
              <h3 className="text-2xl font-bold mb-1 group-hover:text-yellow-400 transition-colors">{track.name}</h3>
              <div className="flex items-center text-sm text-gray-400 space-x-2">
                <span>Technicality:</span>
                <div className="flex">
                   {[...Array(5)].map((_, i) => (
                     <div key={i} className={`w-2 h-2 rounded-full mx-0.5 ${i < (track.id === 'track1' ? 2 : track.id === 'track2' ? 4 : 5) ? 'bg-yellow-500' : 'bg-gray-600'}`} />
                   ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 bg-gray-800 p-6 rounded-xl border border-gray-700 text-center max-w-md">
        <h4 className="text-yellow-400 font-bold mb-4">CONTROLS</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="flex items-center justify-center space-x-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded border-b-2 border-gray-600">W</kbd>
                <span>GAS</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded border-b-2 border-gray-600">S</kbd>
                <span>BRAKE</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded border-b-2 border-gray-600">A</kbd>
                <span>LEFT</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded border-b-2 border-gray-600">D</kbd>
                <span>RIGHT</span>
            </div>
             <div className="flex items-center justify-center col-span-2 space-x-2">
                <kbd className="px-8 py-1 bg-gray-700 rounded border-b-2 border-gray-600">SPACE</kbd>
                <span>HANDBRAKE</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
