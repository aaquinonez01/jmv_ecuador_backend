// Gira y Aprende: categorías propias de JMV (cada una da una insignia)
export const GAME_CATEGORIES = [
  'biblia',
  'maria',
  'vicenciana',
  'historia_jmv',
  'iglesia',
  'santos_mision',
] as const;
export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const GAME_LEVELS = ['infancia', 'prejuvenil', 'juvenil'] as const;

export const MAX_ROUNDS = 25;
/** Segundos para responder (más un margen por la red) */
export const ANSWER_SECONDS = 30;
export const ANSWER_GRACE_SECONDS = 5;
/** Horas sin jugar su turno: pierde la partida */
export const TURN_TIMEOUT_HOURS = 72;
/** Días que una partida al azar espera rival */
export const WAITING_DAYS = 7;
export const MAX_ACTIVE_MATCHES = 10;
/** Aciertos seguidos para llenar el medidor y jugar por una insignia */
export const METER_FULL = 3;
