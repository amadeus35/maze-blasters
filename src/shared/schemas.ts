import * as z from "zod";

const playerIdSchema = z.string();
const tickSchema = z.number();

const worldConfigSchema = z.object({
  seed: z.number(),
  blockLimit: z.number(),
});

// Client Messages
const playerStateSchema = z.object({
  id: playerIdSchema,
  x: z.number(),
  y: z.number(),
  alive: z.boolean(),
});


// Server Messages
const welcomeMessageSchema = z.object({
  t: z.literal("welcome"),
  id: playerIdSchema,
  tick: tickSchema,
  worldConfig: worldConfigSchema,
});

const stateMessageSchema = z.object({
  t: z.literal("state"),
  tick: tickSchema,
  players: z.array(playerStateSchema),
});

export const serverMessageSchema = z.discriminatedUnion("t", [
  welcomeMessageSchema,
  stateMessageSchema,
]);
