// DEV-only debug switches. The simulation must never read anything in here —
// these flags only influence what render.ts draws. If step() ever branched on a
// debug flag, two clients with the panel toggled differently would desync.

import { IS_DEV } from './env.js'

/** Mutable, read by the renderer once per frame. */
export const debugFlags = {
  showHitbox: false,
}

const STORAGE_KEY = 'maze-blasters:debug'

/**
 * Builds the debug panel and attaches it to the page. Outside DEV this is a
 * no-op, so in a production build the toggle does not exist at all — there is
 * nothing to hide and nothing to accidentally ship enabled.
 */
export function setupDebugPanel(): void {
  if (!IS_DEV) return

  restore()

  const panel = document.createElement('div')
  panel.id = 'debug-panel'
  panel.style.cssText = [
    'position:fixed',
    'top:8px',
    'left:8px',
    'z-index:10',
    'display:flex',
    'gap:10px',
    'align-items:center',
    'padding:6px 9px',
    'border-radius:4px',
    'background:#1d2233',
    'border:1px solid #39405c',
    'font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'color:#8d97b5',
    'user-select:none',
  ].join(';')

  panel.append(
    checkbox('show hitbox', debugFlags.showHitbox, (on) => {
      debugFlags.showHitbox = on
      persist()
    }),
  )

  document.body.append(panel)
}

function checkbox(
  labelText: string,
  initial: boolean,
  onChange: (checked: boolean) => void,
): HTMLLabelElement {
  const label = document.createElement('label')
  label.style.cssText = 'display:flex;gap:6px;align-items:center;cursor:pointer'

  const box = document.createElement('input')
  box.type = 'checkbox'
  box.checked = initial
  box.addEventListener('change', () => onChange(box.checked))

  label.append(box, document.createTextNode(labelText))
  return label
}

function restore(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) Object.assign(debugFlags, JSON.parse(saved))
  } catch {
    // Corrupt or unavailable storage: fall back to defaults.
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(debugFlags))
  } catch {
    // Storage unavailable (private mode, quota): the toggle still works for
    // this session, it just will not be remembered.
  }
}
