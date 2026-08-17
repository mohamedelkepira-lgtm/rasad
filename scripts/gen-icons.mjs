// توليد أيقونات التطبيق (PNG) — Navy مستطيل بحواف دائرية + علامة صح بيضاء
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const NAVY = [11, 36, 71]

function inRoundedRect(px, py, x0, y0, w, h, r) {
  if (px < x0 || px > x0 + w || py < y0 || py > y0 + h) return false
  const cx = Math.max(x0 + r, Math.min(px, x0 + w - r))
  const cy = Math.max(y0 + r, Math.min(py, y0 + h - r))
  return Math.hypot(px - cx, py - cy) <= r
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay
  const apx = px - ax, apy = py - ay
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)))
  const cx = ax + abx * t, cy = ay + aby * t
  return Math.hypot(px - cx, py - cy)
}

// علامة صح من قطعتين
function checkDistance(px, py, size, inset) {
  const thick = size * 0.085
  const a = { x: size * (0.28 + inset), y: size * (0.52 + inset * 0.4) }
  const b = { x: size * (0.42 + inset), y: size * (0.68 + inset * 0.4) }
  const c = { x: size * (0.74 + inset * 0.5), y: size * (0.36 + inset * 0.5) }
  const d1 = distToSegment(px, py, a.x, a.y, b.x, b.y)
  const d2 = distToSegment(px, py, b.x, b.y, c.x, c.y)
  return Math.min(d1, d2) <= thick / 2
}

function makeIcon(size, { maskable = false } = {}) {
  const png = new PNG({ width: size, height: size })
  const r = size * 0.24
  const margin = maskable ? 0 : size * 0.06
  const x0 = margin, y0 = margin, w = size - margin * 2, h = size - margin * 2
  const inset = maskable ? 0.06 : 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2
      let navyOn
      if (maskable) {
        navyOn = true
      } else {
        navyOn = inRoundedRect(x + 0.5, y + 0.5, x0, y0, w, h, r)
      }
      if (navyOn) {
        png.data[i] = NAVY[0]
        png.data[i + 1] = NAVY[1]
        png.data[i + 2] = NAVY[2]
        png.data[i + 3] = 255
        if (checkDistance(x + 0.5, y + 0.5, size, inset)) {
          png.data[i] = 255
          png.data[i + 1] = 255
          png.data[i + 2] = 255
        }
      } else {
        png.data[i + 3] = 0
      }
    }
  }
  return PNG.sync.write(png)
}

writeFileSync(join(outDir, 'icon-192.png'), makeIcon(192))
writeFileSync(join(outDir, 'icon-512.png'), makeIcon(512))
writeFileSync(join(outDir, 'icon-512-maskable.png'), makeIcon(512, { maskable: true }))
writeFileSync(join(outDir, 'icon-192-maskable.png'), makeIcon(192, { maskable: true }))
writeFileSync(join(outDir, 'apple-touch-icon.png'), makeIcon(180))

console.log('Icons generated ->', outDir)
