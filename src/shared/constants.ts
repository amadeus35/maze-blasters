// Tuning knobs that BOTH the client and the server must agree on exactly.
// If these two ever disagree at runtime, you get desync — and desync bugs
// look like ghosts, not like errors. Keep every such number in this file.

/** Simulation ticks per second. The heartbeat of the whole game. */
export const TICK_RATE = 60
/** Milliseconds of simulated time that one tick represents. */
export const TICK_MS = 1000 / TICK_RATE

/**
 * How often the server BROADCASTS state, in ticks.
 * 1 = every tick (60/s, wasteful). 3 = 20/s (a common real-world choice).
 *
 * Phase 1 asks you: "at what point does tick rate vs. send rate become a
 * design decision rather than an accident?" This constant is that decision.
 * It is deliberately set to 1 right now so that it is NOT yet a decision —
 * change it when you can explain what breaks.
 */
export const SEND_EVERY_N_TICKS = 1

/** Grid is odd-sized so the classic pillar pattern lands on odd/odd cells. */
export const GRID_W = 15
export const GRID_H = 13
export const HALF_TILE_LENGTH = 0.5 // In Grid Units

/** Render size of one grid cell, in CSS pixels. Purely cosmetic. */
export const TILE_PX = 40

/**
 * Player model dimensions in grid units
 */
export const PLAYER_HALF_W = 0.25

export const PORT = 8080
