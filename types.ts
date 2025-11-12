export type Vector2 = {
  x: number;
  y: number;
};

export type Line = {
  p1: Vector2;
  p2: Vector2;
};

export type Track = {
  id: string;
  name: string;
  color: string;
  startPosition: Vector2;
  startRotation: number;
  outerWalls: Line[];
  innerWalls: Line[];
  checkpoints: Line[]; // Simple lines to cross
};

export type CarState = {
  pos: Vector2;
  vel: Vector2;
  angle: number; // Car facing direction in radians
  angularVel: number;
  steerAngle: number;
  isDrifting: boolean;
};

export type Particle = {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export type SkidMark = {
  p1: Vector2;
  p2: Vector2;
  opacity: number;
};

export enum GameState {
  MENU,
  PLAYING,
  FINISHED
}
