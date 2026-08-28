import type {PlayerHitBox, PlayerState} from "./types.js";
import {PLAYER_CENTER_OFFSET, PLAYER_HALF_W} from "./constants.js";
export function getHitbox(playerX:number, playerY: number): PlayerHitBox {
    const playerWidth = PLAYER_HALF_W * 2
    const playerCenterOffHalf = PLAYER_CENTER_OFFSET / 2
    playerX += playerCenterOffHalf
    playerY += playerCenterOffHalf
    return {
        topLeft: [playerX, playerY],
        topRight: [playerX + playerWidth, playerY],
        bottomRight: [playerX + playerWidth, playerY + playerWidth],
        bottomLeft: [playerX, playerY + playerWidth]
    }
}