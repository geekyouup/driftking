
import React, { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../constants';
import { CarState, Track, Vector2, Particle, SkidMark } from '../types';
import { vecAdd, vecMult, vecRotate, getWallCollision, vecMag, vecSub, vecDot, vecNormalize, getLineIntersection } from '../utils/physics';

interface GameCanvasProps {
  track: Track;
  onExit: () => void;
}

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
};

const GameCanvas: React.FC<GameCanvasProps> = ({ track, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use refs for game state to avoid React render cycle in game loop
  const gameState = useRef<CarState>({
    pos: { ...track.startPosition },
    vel: { x: 0, y: 0 },
    angle: track.startRotation,
    angularVel: 0,
    steerAngle: 0,
    isDrifting: false,
  });

  const particles = useRef<Particle[]>([]);
  const skidMarks = useRef<SkidMark[]>([]);
  const inputs = useRef({ up: false, down: false, left: false, right: false, space: false });
  
  // Lap Timing Refs
  const nextCheckpointIndex = useRef(1); // Assume we start at index 0, so next is 1
  const currentLapStartTime = useRef(0);
  const lastCarPos = useRef<Vector2>({ ...track.startPosition });
  const bestLapTimeRef = useRef<number | null>(null);
  const currentLapRef = useRef(1);

  // React state for HUD updates (low frequency)
  const [speed, setSpeed] = useState(0);
  const [driftScore, setDriftScore] = useState(0);
  const [lapData, setLapData] = useState({ lap: 1, time: 0, best: null as number | null });
  const scoreRef = useRef(0); // Ref for high frequency accumulation

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowUp': case 'KeyW': inputs.current.up = true; break;
        case 'ArrowDown': case 'KeyS': inputs.current.down = true; break;
        case 'ArrowLeft': case 'KeyA': inputs.current.left = true; break;
        case 'ArrowRight': case 'KeyD': inputs.current.right = true; break;
        case 'Space': inputs.current.space = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowUp': case 'KeyW': inputs.current.up = false; break;
        case 'ArrowDown': case 'KeyS': inputs.current.down = false; break;
        case 'ArrowLeft': case 'KeyA': inputs.current.left = false; break;
        case 'ArrowRight': case 'KeyD': inputs.current.right = false; break;
        case 'Space': inputs.current.space = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on bg
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    // Reset state on track change
    gameState.current = {
      pos: { ...track.startPosition },
      vel: { x: 0, y: 0 },
      angle: track.startRotation,
      angularVel: 0,
      steerAngle: 0,
      isDrifting: false,
    };
    lastCarPos.current = { ...track.startPosition };
    particles.current = [];
    skidMarks.current = [];
    scoreRef.current = 0;
    
    // Reset Lap Stats
    nextCheckpointIndex.current = 1;
    currentLapStartTime.current = performance.now();
    currentLapRef.current = 1;
    bestLapTimeRef.current = null;
    
    setDriftScore(0);
    setLapData({ lap: 1, time: 0, best: null });

    const updatePhysics = () => {
      const car = gameState.current;
      const input = inputs.current;
      const prevPos = { ...car.pos };

      // --- Steering Logic ---
      const targetSteer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      const steerSpeed = 0.08;
      car.steerAngle += (targetSteer * GAME_CONFIG.MAX_STEER_ANGLE - car.steerAngle) * steerSpeed;

      // --- Acceleration ---
      const accelDir = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
      if (input.up) {
        car.vel = vecAdd(car.vel, vecMult(accelDir, GAME_CONFIG.ACCELERATION));
      } else if (input.down) {
         car.vel = vecAdd(car.vel, vecMult(accelDir, -GAME_CONFIG.BRAKING));
      }

      // Cap max speed
      const currentSpeed = vecMag(car.vel);
      if (currentSpeed > GAME_CONFIG.MAX_SPEED) {
        car.vel = vecMult(car.vel, GAME_CONFIG.MAX_SPEED / currentSpeed);
      }

      // --- Drifting Physics ---
      const localVel = vecRotate(car.vel, -car.angle);
      
      let gripThreshold = GAME_CONFIG.GRIP_THRESHOLD;
      if (input.up) gripThreshold *= 0.85;

      const isSliding = Math.abs(localVel.y) > gripThreshold;
      const isHandBraking = input.space;

      let lateralFriction = GAME_CONFIG.LATERAL_FRICTION;
      
      if (isSliding || isHandBraking) {
        car.isDrifting = true;
        lateralFriction = 0.97; 
        if (isHandBraking) lateralFriction = 0.95;
      } else {
        car.isDrifting = false;
        lateralFriction = 0.75; 
      }

      localVel.x *= GAME_CONFIG.FRICTION;
      localVel.y *= lateralFriction;

      car.vel = vecRotate(localVel, car.angle);

      // --- Angular Physics ---
      if (currentSpeed > 0.5) {
          const dir = vecDot(car.vel, accelDir) < -0.1 ? -1 : 1;
          let turnRate = GAME_CONFIG.TURN_SPEED;

          if (car.isDrifting) {
             turnRate *= 1.4; 
             if (input.up) turnRate *= 1.3;
             if (input.space) turnRate *= 1.5;
          }

          car.angle += car.steerAngle * turnRate * dir;
      }
      
      // --- Position Update ---
      car.pos = vecAdd(car.pos, car.vel);

      // --- Wall Collision ---
      const collisionRadius = GAME_CONFIG.CAR_WIDTH / 1.5;
      const collision = getWallCollision(car.pos, collisionRadius, [...track.outerWalls, ...track.innerWalls]);
      
      if (collision) {
        const penetration = collisionRadius - collision.dist;
        const correction = vecMult(collision.normal, penetration + 0.1);
        car.pos = vecAdd(car.pos, correction);

        const wallVec = vecSub(collision.wall.p2, collision.wall.p1);
        const wallDir = vecNormalize(wallVec);
        
        const parallelSpeed = vecDot(car.vel, wallDir);
        car.vel = vecMult(wallDir, parallelSpeed);
        
        car.vel = vecMult(car.vel, 0.92);
      }
      
      // --- Checkpoint / Lap Logic ---
      if (track.checkpoints.length > 0) {
          const targetCpIdx = nextCheckpointIndex.current;
          const targetCp = track.checkpoints[targetCpIdx];
          
          if (getLineIntersection(lastCarPos.current, car.pos, targetCp.p1, targetCp.p2)) {
              // Checkpoint crossed
              if (targetCpIdx === 0) {
                  // Finish Line Crossed
                  const now = performance.now();
                  const lapTime = now - currentLapStartTime.current;
                  
                  // Only update best time if it's a valid lap (usually > some minimal time to avoid glitch)
                  if (lapTime > 5000) {
                      if (bestLapTimeRef.current === null || lapTime < bestLapTimeRef.current) {
                          bestLapTimeRef.current = lapTime;
                      }
                      currentLapRef.current += 1;
                      currentLapStartTime.current = now;
                  }
              }
              
              // Advance to next checkpoint
              nextCheckpointIndex.current = (nextCheckpointIndex.current + 1) % track.checkpoints.length;
          }
      }
      
      lastCarPos.current = { ...car.pos };

      // --- Particles & Effects ---
      if (car.isDrifting && currentSpeed > 2) {
        const rearOffset = 15;
        const wheelOffset = 10;
        const rearCenter = vecSub(car.pos, vecMult({x: Math.cos(car.angle), y: Math.sin(car.angle)}, rearOffset));
        const leftWheel = vecAdd(rearCenter, vecRotate({x: 0, y: -wheelOffset}, car.angle));
        const rightWheel = vecAdd(rearCenter, vecRotate({x: 0, y: wheelOffset}, car.angle));
        
        skidMarks.current.push({ p1: leftWheel, p2: vecAdd(leftWheel, vecMult(car.vel, -0.1)), opacity: 0.3 });
        skidMarks.current.push({ p1: rightWheel, p2: vecAdd(rightWheel, vecMult(car.vel, -0.1)), opacity: 0.3 });

        if (Math.random() > 0.7) {
           particles.current.push({
             pos: vecAdd(rearCenter, { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 }),
             vel: { x: (Math.random() - 0.5), y: (Math.random() - 0.5) },
             life: 1.0,
             maxLife: 1.0 + Math.random(),
             size: 5 + Math.random() * 5,
             color: `rgba(200, 200, 200, 0.5)`
           });
        }
        scoreRef.current += Math.round(vecMag(car.vel) * Math.abs(car.steerAngle) * 10);
      }
    };

    const updateParticles = () => {
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.life -= 0.02;
        p.pos = vecAdd(p.pos, p.vel);
        p.size += 0.2;
        if (p.life <= 0) particles.current.splice(i, 1);
      }
      if (skidMarks.current.length > 300) {
        skidMarks.current = skidMarks.current.slice(skidMarks.current.length - 300);
      }
    };

    const draw = () => {
      // --- Clear & Background ---
      ctx.fillStyle = track.color;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

      // --- Skidmarks ---
      ctx.lineWidth = 4;
      for (const skid of skidMarks.current) {
        ctx.strokeStyle = `rgba(20, 20, 20, ${skid.opacity})`;
        ctx.beginPath();
        ctx.moveTo(skid.p1.x, skid.p1.y);
        ctx.lineTo(skid.p2.x, skid.p2.y);
        ctx.stroke();
      }

      // --- Walls ---
      ctx.lineCap = 'round';
      const drawWalls = (walls: typeof track.outerWalls, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        walls.forEach(w => {
          ctx.moveTo(w.p1.x, w.p1.y);
          ctx.lineTo(w.p2.x, w.p2.y);
        });
        ctx.stroke();
      };

      ctx.setLineDash([20, 20]);
      drawWalls(track.outerWalls, '#ef4444'); 
      ctx.lineDashOffset = 20;
      drawWalls(track.outerWalls, '#ffffff'); 
      
      drawWalls(track.innerWalls, '#ef4444');
      ctx.lineDashOffset = 0;
      drawWalls(track.innerWalls, '#ffffff');
      ctx.setLineDash([]);
      
      drawWalls(track.outerWalls, '#111');
      drawWalls(track.innerWalls, '#111');
      
      // --- Start/Finish Line ---
      if (track.checkpoints.length > 0) {
         const start = track.checkpoints[0];
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
         ctx.lineWidth = 10;
         ctx.setLineDash([10, 10]);
         ctx.beginPath();
         ctx.moveTo(start.p1.x, start.p1.y);
         ctx.lineTo(start.p2.x, start.p2.y);
         ctx.stroke();
         ctx.setLineDash([]);
      }

      // --- Car ---
      const car = gameState.current;
      ctx.save();
      ctx.translate(car.pos.x, car.pos.y);
      ctx.rotate(car.angle);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-GAME_CONFIG.CAR_LENGTH / 2 + 5, -GAME_CONFIG.CAR_WIDTH / 2 + 5, GAME_CONFIG.CAR_LENGTH, GAME_CONFIG.CAR_WIDTH);

      ctx.fillStyle = '#ef4444'; 
      ctx.fillRect(-GAME_CONFIG.CAR_LENGTH / 2, -GAME_CONFIG.CAR_WIDTH / 2, GAME_CONFIG.CAR_LENGTH, GAME_CONFIG.CAR_WIDTH);
      
      ctx.fillStyle = '#111';
      ctx.fillRect(-5, -10, 15, 20); 

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(GAME_CONFIG.CAR_LENGTH/2 - 2, -8, 3, 0, Math.PI * 2);
      ctx.arc(GAME_CONFIG.CAR_LENGTH/2 - 2, 8, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 200, 0.1)';
      ctx.beginPath();
      ctx.moveTo(20, -10);
      ctx.lineTo(150, -40);
      ctx.lineTo(150, -5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(20, 10);
      ctx.lineTo(150, 40);
      ctx.lineTo(150, 5);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.fillRect(-18, -14, 10, 4);
      ctx.fillRect(-18, 10, 10, 4);
      
      ctx.save();
      ctx.translate(18, -14);
      ctx.rotate(car.steerAngle);
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();

      ctx.save();
      ctx.translate(18, 10);
      ctx.rotate(car.steerAngle);
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();

      ctx.restore();

      // --- Particles ---
      for (const p of particles.current) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    };

    const gameLoop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      updatePhysics();
      updateParticles();
      draw();

      // Update HUD @ 15Hz
      if (time % 66 < 16) {
        setSpeed(Math.round(vecMag(gameState.current.vel) * 10));
        setDriftScore(scoreRef.current);
        setLapData({
            lap: currentLapRef.current,
            time: performance.now() - currentLapStartTime.current,
            best: bestLapTimeRef.current
        });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [track]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.CANVAS_WIDTH}
        height={GAME_CONFIG.CANVAS_HEIGHT}
        className="max-w-full max-h-full shadow-2xl rounded-lg border border-gray-800"
      />
      
      {/* Drift Score */}
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="bg-gray-900 bg-opacity-80 backdrop-blur text-white p-4 rounded-lg border-l-4 border-yellow-500 shadow-lg">
           <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Drift Score</div>
           <div className="text-4xl font-black italic font-mono">{driftScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Lap Timing Board */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none select-none">
         <div className="bg-gray-900 bg-opacity-90 backdrop-blur text-white px-8 py-3 rounded-b-xl border-b-4 border-yellow-500 shadow-xl flex space-x-8">
            <div className="text-center">
               <div className="text-xs text-gray-500 uppercase tracking-wider">Lap</div>
               <div className="text-2xl font-bold font-mono text-yellow-400">{lapData.lap}</div>
            </div>
            <div className="text-center w-32">
               <div className="text-xs text-gray-500 uppercase tracking-wider">Time</div>
               <div className="text-2xl font-bold font-mono">{formatTime(lapData.time)}</div>
            </div>
            <div className="text-center w-32">
               <div className="text-xs text-gray-500 uppercase tracking-wider">Best</div>
               <div className="text-2xl font-bold font-mono text-green-400">
                 {lapData.best ? formatTime(lapData.best) : '--:--.--'}
               </div>
            </div>
         </div>
      </div>

      {/* Speedometer */}
      <div className="absolute bottom-4 right-4 pointer-events-none select-none">
        <div className="relative w-32 h-32 bg-gray-900 bg-opacity-80 rounded-full border-4 border-gray-800 flex items-center justify-center shadow-lg">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-500 transform -rotate-45 transition-transform duration-75" style={{ transform: `rotate(${-135 + (speed * 1.5)}deg)`}}></div>
            <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">{speed}</div>
                <div className="text-xs text-gray-500 font-bold">KM/H</div>
            </div>
        </div>
      </div>

      <button 
        onClick={onExit}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow-lg transition-transform transform hover:scale-105 z-20"
      >
        EXIT TRACK
      </button>
    </div>
  );
};

export default GameCanvas;
