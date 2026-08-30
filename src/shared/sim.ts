// ============================================================================
// THE SIMULATION
// ============================================================================
// This file is the reason the project is structured the way it is.
//
// The SAME code in this file runs in three different places:
//   1. On the server, as the authoritative truth.
//   2. On your client, predicting your own player ahead of the server.
//   3. On your client AGAIN, re-running past ticks during reconciliation.
//
// That triple duty imposes one hard rule, and every netcode bug you are about
// to have will be a violation of it:
//
//   *** step() MUST be a pure function of (world, inputs). ***
//
// No Date.now(). No Math.random(). No reading the keyboard. No drawing. No
// network calls. Nothing that could produce a different answer on a different
// machine, or on a re-run of the same tick. If you need randomness (block
// layout, powerup drops), use a seeded PRNG whose seed lives IN WorldState.
// ============================================================================

import {GRID_W, GRID_H, PLAYER_HALF_W} from './constants.js'
import {
  Tile,
  type PlayerId,
  type PlayerState,
  type WorldState,
  type InputCommand,
  type WorldConfig,
  type PlayerHitBox
} from './types.js'
import {getHitbox} from "./player_helpers.js";

/** Read a tile safely. Out of bounds counts as solid Wall — no bounds checks
 *  scattered through your movement code, and no undefined leaking in. */
export function tileAt(world: WorldState, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return Tile.Wall
  return world.tiles[y * GRID_W + x] ?? Tile.Wall
}

export function setTile(world: WorldState, x: number, y: number, v: number): void {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return
  world.tiles[y * GRID_W + x] = v
}

function wouldCollide(world: WorldState, playerXIntent:number, playerYIntent:number): boolean{
  const playerHitbox: PlayerHitBox = getHitbox(playerXIntent, playerYIntent)
  const flooredHitbox: PlayerHitBox = {
    topLeft: [Math.floor(playerHitbox.topLeft[0]), Math.floor(playerHitbox.topLeft[1])],
    topRight: [Math.floor(playerHitbox.topRight[0]), Math.floor(playerHitbox.topRight[1])],
    bottomRight: [Math.floor(playerHitbox.bottomRight[0]), Math.floor(playerHitbox.bottomRight[1])],
    bottomLeft: [Math.floor(playerHitbox.bottomLeft[0]), Math.floor(playerHitbox.bottomLeft[1])],
  }

  return tileAt(world, flooredHitbox.topLeft[0], flooredHitbox.topLeft[1]) !== Tile.Floor ||
      tileAt(world, flooredHitbox.topRight[0], flooredHitbox.topRight[1]) !== Tile.Floor ||
      tileAt(world, flooredHitbox.bottomRight[0], flooredHitbox.bottomRight[1]) !== Tile.Floor ||
      tileAt(world, flooredHitbox.bottomLeft[0], flooredHitbox.bottomLeft[1]) !== Tile.Floor
}

/** Builds the starting world: border walls plus the classic odd/odd pillars. */
export function createWorld(config: WorldConfig): WorldState {
  let seed = config.seed
  let blockCount = 0
  const printBlock =() => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const nextSeqNumber =  ((t ^ (t >>> 14)) >>> 0) / 4294967296
    const printBlock = nextSeqNumber <= 0.5 && (blockCount + 1 <= config.blockLimit)
    if(printBlock){
      blockCount += 1
    }
    return printBlock
  }

  const tiles = new Uint8Array(GRID_W * GRID_H)
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const border = x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1
      const pillar = x % 2 === 0 && y % 2 === 0
      const spawnZone = (x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1)

      tiles[y * GRID_W + x] = border || pillar ?
          Tile.Wall : printBlock() && !spawnZone ?
              Tile.Block : Tile.Floor
    }
  }

  // EXERCISE 0.1 — Destructible blocks.
  // Scatter Tile.Block over the floor, keeping each spawn corner and its two
  // neighbours clear so players are not entombed at tick 0.
  // Before you write it: where does the randomness come from? If the server
  // and the client each call Math.random() they will build DIFFERENT MAZES.
  // Decide now whether the layout is generated once on the server and shipped
  // to clients, or generated from a shared seed. Both are legitimate; they
  // have different failure modes when a player joins late (Phase 5).

  return { tick: 0, tiles, players: new Map() }
}

/**
 * A deep, independent copy of the world.
 *
 * Phase 2 leans on this hard: prediction means "copy the last confirmed state,
 * replay my unacknowledged inputs onto the copy, render the copy". If this
 * function ever shares a reference with the original, replaying will corrupt
 * your confirmed state and you will chase it for hours. When you add bombs to
 * WorldState, you MUST add them here too.
 */
export function cloneWorld(world: WorldState): WorldState {
  return {
    tick: world.tick,
    tiles: world.tiles.slice(),
    players: new Map(
      [...world.players].map(([id, p]) => [id, { ...p }]),
    ),
  }
}

export function addPlayer(world: WorldState, id: PlayerId, x: number, y: number): PlayerState {
  const p: PlayerState = {
    id,
    x,
    y,
    alive: true
  }
  world.players.set(id, p)
  return p
}

/**
 * Advance the world by EXACTLY one tick.
 *
 * @param world   mutated in place
 * @param inputs  each player's intent for this tick. A player missing from the
 *                map has sent nothing — note that "no input" is itself a
 *                decision you are making about them.
 */
export function step(world: WorldState, inputs: Map<PlayerId, InputCommand>): void {
  for (const player of world.players.values()) {
    if (!player.alive) continue
    const input = inputs.get(player.id)
    if (!input) continue

    const SPEED = 0.08 // grid cells per tick
    let playerXIntent = player.x
    let playerYIntent = player.y

    if (input.left) playerXIntent -= SPEED
    if (input.right) playerXIntent += SPEED
    if (input.up) playerYIntent -= SPEED
    if (input.down) playerYIntent += SPEED


    // EXERCISE 0.2 — Real grid movement with wall collision.
    //   The design question underneath this: is a player AT a cell, or at a
    //   float position that OVERLAPS cells? Classic Bomberman is the second
    //   (you slide along walls and get nudged around corners), which is much
    //   nicer to play and much harder to make deterministic. Pick one and
    //   write down why. Whatever you pick, it must produce bit-identical
    //   results from identical inputs — beware accumulated float drift.

    if(!wouldCollide(world, playerXIntent, player.y)){
      if (input.left) player.x = playerXIntent
      if (input.right) player.x = playerXIntent
    }

    if(!wouldCollide(world, player.x, playerYIntent)){
      if (input.up) player.y = playerYIntent
      if (input.down) player.y = playerYIntent
    }





    // EXERCISE 0.3 — Bomb placement.
    //   `input.bomb` is held down across many ticks; a held key must not lay
    //   60 bombs a second. Where does "was this key already down last tick?"
    //   live — in WorldState, or in the input itself? Your answer decides
    //   whether replaying a tick during reconciliation lays a phantom bomb.
  }

  // EXERCISE 0.4 — Bomb fuses, explosions, chain reactions, deaths.
  //   Ordering is the whole exercise. Two bombs owned by two players expire on
  //   the same tick next to each other: whichever you resolve first determines
  //   who dies. Iteration order over a Map is insertion order, which differs
  //   between a server that saw player B connect first and a client that only
  //   ever knew about them in a different order. Find a total ordering that
  //   every machine can compute independently from WorldState alone.

  world.tick++
}
