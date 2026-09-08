// The vocabulary of the game. Shared by client and server so that a change
// to the shape of the world is a compile error on both sides, not a runtime
// mystery on one side.

declare const TileIndexBrand: unique symbol // Brand to enforce integer values on `TileIndex` type

export type PlayerId = string
export type Tick = number

/** What occupies a grid cell. Stored as bytes so the grid is cheap to copy. */
export const Tile = {
  Floor: 0,
  /** Indestructible. Border + the odd/odd pillars. */
  Wall: 1,
  /** Destructible. Blown up by blasts. */
  Block: 2,
} as const

export type TileValue = (typeof Tile)[keyof typeof Tile]
export type TileIndex = number & { readonly [TileIndexBrand]: true }

/**
 * One player's intent for one tick.
 *
 * `seq` is a monotonically increasing number the CLIENT assigns. You will not
 * care about it in Phase 0. In Phase 2 it becomes the single most important
 * field in this file: it is how the client asks "which of my inputs has the
 * server actually processed?", which is the question reconciliation answers.
 */
export interface InputCommand {
  seq: number
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  bomb: boolean
}

export type CoordinatePoint<XValue, YValue> = [x: XValue, y: YValue]

export type TileCoordinatePoint = CoordinatePoint<number, number>
export type CanvasCoordinatePoint = CoordinatePoint<number, number>
/**
 * TileAddress represents a tile's "origin" and should there for be a tuple of integers
 */
export type TileAddress = CoordinatePoint<number, number>

export interface PlayerHitBox{
  topLeft: TileCoordinatePoint
  topRight: TileCoordinatePoint
  bottomRight: TileCoordinatePoint
  bottomLeft: TileCoordinatePoint
}

export interface PlayerState {
  id: PlayerId
  /** Position in GRID units (not pixels). Fractional = mid-cell. */
  x: number
  y: number
  alive: boolean
}

export type Bomb = { owner:PlayerId, tick: Tick, tileIndex: TileIndex }

export interface WorldConfig {
  readonly seed: number
  readonly blockLimit: number
}

/**
 * The complete state of the world at one instant.
 *
 * Phase 0 asks: "How will you represent the state of the world at tick N as a
 * distinct, snapshot-able thing?" This interface is your answer, and it is
 * currently incomplete on purpose — there are no bombs and no explosions in it.
 *
 * The property that matters is not "does it have the right fields" but:
 *   Can I copy this, advance the copy 5 ticks, and throw the copy away
 *   without the original being affected in any way?
 * If the answer is ever "no", prediction in Phase 2 will not work.
 */
export interface WorldState {
  tick: Tick
  /** Length GRID_W * GRID_H, indexed by (y * GRID_W + x). */
  tiles: Uint8Array
  bombs: Map<TileIndex, Bomb>
  players: Map<PlayerId, PlayerState>
  playersPreviousInput: Map<PlayerId, InputCommand>
}

// ---------------------------------------------------------------------------
// Wire protocol
// ---------------------------------------------------------------------------
// Deliberately tiny. Grow it as each phase demands, and notice WHEN it has to
// grow — every new message type is evidence about what the network could not
// express before.

/** Client -> Server */
export type ClientMessage =
  | { t: 'input'; cmd: InputCommand }

/** Server -> Client
 * The state message omits `playersPreviousInput` because it's a client-side piece of state that is not need on the server at this time.
 *
 * */
export type ServerMessage =
  | { t: 'welcome'; id: PlayerId; tick: Tick, worldConfig: WorldConfig }
  | { t: 'state'; tick: Tick; players: PlayerState[], bombs: Bomb[]}
