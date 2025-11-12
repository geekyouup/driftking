
import { Track } from './types';

export const GAME_CONFIG = {
  FPS: 60,
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 768,
  CAR_WIDTH: 24,
  CAR_LENGTH: 44,
  MAX_SPEED: 15,
  ACCELERATION: 0.2,
  BRAKING: 0.3,
  FRICTION: 0.98, // Air resistance
  TURN_SPEED: 0.06, // How fast wheels turn
  MAX_STEER_ANGLE: 0.6, // Max wheel angle in radians
  DRIFT_GRIP: 0.94, // Low value = icy, High value = rails. 0.94 allows sliding
  GRIP_THRESHOLD: 3, // Speed needed to lose traction easily
  LATERAL_FRICTION: 0.85, // Resistance to sliding sideways
};

// Helper to create a box track
const createBox = (x: number, y: number, w: number, h: number) => [
  { p1: { x, y }, p2: { x: x + w, y } },
  { p1: { x: x + w, y }, p2: { x: x + w, y: y + h } },
  { p1: { x: x + w, y: y + h }, p2: { x, y: y + h } },
  { p1: { x, y: y + h }, p2: { x, y } },
];

// Helper to generate track walls from points
const generateWalls = (points: number[][]): { p1: {x: number, y: number}, p2: {x: number, y: number} }[] => {
  const walls = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    walls.push({
      p1: { x: points[i][0], y: points[i][1] },
      p2: { x: points[next][0], y: points[next][1] },
    });
  }
  return walls;
};

export const TRACKS: Track[] = [
  {
    id: 'track1',
    name: 'The Donut',
    color: '#374151',
    startPosition: { x: 150, y: 384 },
    startRotation: -Math.PI / 2,
    outerWalls: generateWalls([
      [50, 50], [974, 50], [974, 718], [50, 718]
    ]),
    innerWalls: generateWalls([
      [300, 200], [724, 200], [724, 568], [300, 568]
    ]),
    checkpoints: [
       { p1: { x: 50, y: 384 }, p2: { x: 300, y: 384 } }, // Start/Finish
       { p1: { x: 512, y: 50 }, p2: { x: 512, y: 200 } },
       { p1: { x: 724, y: 384 }, p2: { x: 974, y: 384 } },
       { p1: { x: 512, y: 568 }, p2: { x: 512, y: 718 } },
    ]
  },
  {
    id: 'track2',
    name: 'Figure 8',
    color: '#1f2937',
    startPosition: { x: 100, y: 150 },
    startRotation: 0,
    outerWalls: generateWalls([
      [50, 50], [450, 50], [512, 300], [574, 50], [974, 50],
      [974, 718], [574, 718], [512, 468], [450, 718], [50, 718]
    ]),
    innerWalls: generateWalls([
      [200, 200], [350, 200], [400, 350], [350, 568], [200, 568]
    ]).concat(generateWalls([
      [674, 200], [824, 200], [824, 568], [674, 568], [624, 418]
    ])),
    checkpoints: [
      { p1: { x: 50, y: 384 }, p2: { x: 200, y: 384 } }, // Start/Finish approx
      { p1: { x: 512, y: 300 }, p2: { x: 512, y: 468 } } // Center cross
    ]
  },
  {
    id: 'track3',
    name: 'Hairpin Hollow',
    color: '#111827',
    startPosition: { x: 100, y: 650 },
    startRotation: 0,
    outerWalls: generateWalls([
       [20, 600], [200, 600], [250, 400], [100, 200], [200, 50], 
       [800, 50], [950, 200], [950, 600], [400, 600], [350, 700], 
       [980, 750], [980, 20], [20, 20]
    ]),
    innerWalls: generateWalls([
       [150, 700], [300, 700], [350, 500], [200, 300], [300, 150],
       [700, 150], [800, 300], [800, 500], [500, 500], [550, 400],
       [700, 400], [600, 250], [400, 250], [300, 350], [450, 550], [150, 550]
    ]),
    checkpoints: [
       { p1: { x: 20, y: 650 }, p2: { x: 200, y: 650 } }, // Start/Finish
       { p1: { x: 100, y: 200 }, p2: { x: 200, y: 300 } }, // Hairpin 1 entry
       { p1: { x: 800, y: 50 }, p2: { x: 800, y: 150 } }, // Back straight
       { p1: { x: 800, y: 500 }, p2: { x: 950, y: 500 } }, // Final sector
    ]
  }
];
