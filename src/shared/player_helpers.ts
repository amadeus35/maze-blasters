import type {PlayerHitBox, TileCoordinatePoint} from "./types.js";
import {PLAYER_HALF_W} from "./constants.js";
export function getHitbox(coordinate: TileCoordinatePoint): PlayerHitBox {
    const playerX = coordinate[0]
    const playerY = coordinate[1]
    return {
        topLeft: [playerX - PLAYER_HALF_W, playerY - PLAYER_HALF_W],
        topRight: [playerX + PLAYER_HALF_W, playerY - PLAYER_HALF_W],
        bottomRight: [playerX + PLAYER_HALF_W, playerY + PLAYER_HALF_W],
        bottomLeft: [playerX - PLAYER_HALF_W, playerY + PLAYER_HALF_W]
    }
}