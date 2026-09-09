import { serverMessageSchema } from '../shared/schemas.js'
import type { WorldConfig } from '../shared/types.js'

interface HandlerHooks {
  onWelcome: (config: WorldConfig) => void
  onStateUpdate: () => void
}

let handlers: HandlerHooks = {
  onWelcome: () => {},
  onStateUpdate: () => {},
}

export function connect(hooks: HandlerHooks) {
  handlers = hooks
  const ws = new WebSocket(`ws://${location.host}`)
  ws.addEventListener('open', () => console.log('[net] connected'))
  ws.addEventListener('message', (e) => handleMessage(e))
  ws.addEventListener('close', () => console.log('[net] disconnected'))
}

function handleMessage(event: MessageEvent) {
  let rawMessage
  try {
    rawMessage = JSON.parse(event.data)
  } catch (e) {
    console.error(e)
    return
  }
  const result = serverMessageSchema.safeParse(rawMessage)
  if (!result.success) {
    console.error(result.error)
    return
  }
  const message = result.data
  switch (message.t) {
    case 'welcome':
      handlers.onWelcome(message.worldConfig)
      break
    default: // State message
      console.log('Updating state...')
      handlers.onStateUpdate()
  }
}
