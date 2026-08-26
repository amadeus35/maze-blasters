import type {InputCommand, PlayerId, WorldConfig, WorldState} from "../shared/types.js";
import {TICK_MS} from "../shared/constants.js";
import {sampleInput} from "./input.js";
import {addPlayer, createWorld, step} from "../shared/sim.js";
import {render} from "./render.js";

const LOCAL_ID: PlayerId = 'local'
let world: WorldState|null = null
const inputs = new Map<PlayerId, InputCommand>()
let accumulator = 0
let previous = 0

let canvasCtx:CanvasRenderingContext2D|null = null
let gameHud:HTMLElement|null = null



function frame(now: number): void {
    if(world && canvasCtx && gameHud){
        requestAnimationFrame(frame)

        let elapsed = now - previous
        previous = now

        // Clamp. If the tab was backgrounded for 30 seconds, `elapsed` is 30000ms
        // and the loop below would try to run 1800 ticks in one frame, freeze, and
        // make `elapsed` even larger next frame. This is the classic "spiral of
        // death". Better to drop simulated time than to hang.
        if (elapsed > 250) elapsed = 250

        accumulator += elapsed

        while (accumulator >= TICK_MS) {
            inputs.set(LOCAL_ID, sampleInput())
            step(world, inputs)
            accumulator -= TICK_MS
        }

        render(canvasCtx, world, accumulator / TICK_MS)
        gameHud.textContent = `tick ${world.tick}`
    }
}

const init = function(ctx:CanvasRenderingContext2D, hud:HTMLElement){
    canvasCtx = ctx
    gameHud = hud
}

const start = function(config: WorldConfig){
    if(world === null){
        previous = performance.now()
        world = createWorld(config)
        addPlayer(world, LOCAL_ID, 1, 1)

        requestAnimationFrame(frame)
    }else{
        console.log("A game is already underway.")
    }
}

export const gameClient = {
    init,
    start
} as const