import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

// Texturas generadas por código en un <canvas>: no hace falta descargar imágenes.

const perlin = new ImprovedNoise()

// fBm que se repite sin costuras en una textura de `size` píxeles.
function ruido(x, y, size, celdas, octavas, semilla) {
  let total = 0
  let amp = 1
  let norma = 0
  let per = celdas
  for (let o = 0; o < octavas; o++) {
    const u = (x / size) * per
    const v = (y / size) * per
    const z = semilla + o * 7.13
    const tx = x / size
    const ty = y / size
    const n =
      perlin.noise(u, v, z) * (1 - tx) * (1 - ty) +
      perlin.noise(u - per, v, z) * tx * (1 - ty) +
      perlin.noise(u, v - per, z) * (1 - tx) * ty +
      perlin.noise(u - per, v - per, z) * tx * ty
    total += n * amp
    norma += amp
    amp *= 0.5
    per *= 2
  }
  return THREE.MathUtils.clamp((total / norma) * 1.8, -1, 1)
}

const mezclar = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

function textura(size, pintar, color = true) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pintar(x, y)
      const i = (y * size + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.anisotropy = 8
  return tex
}

export function crearTexturas() {
  const S = 256

  const hierba = textura(S, (x, y) => {
    const n = ruido(x, y, S, 4, 4, 1.3) * 0.5 + 0.5
    const fino = ruido(x, y, S, 32, 2, 4.1) * 0.5 + 0.5
    let c = mezclar([58, 98, 38], [104, 148, 58], n)
    c = mezclar(c, [138, 160, 70], fino * 0.25)
    const brillo = Math.random() < 0.07 ? 1.18 : Math.random() < 0.07 ? 0.82 : 1
    return c.map((v) => v * brillo)
  })

  const roca = textura(S, (x, y) => {
    const n = ruido(x, y, S, 4, 5, 8.7) * 0.5 + 0.5
    const vetas = ruido(x * 0.6, y * 2.2, S, 4, 3, 2.2) * 0.5 + 0.5 // estratos horizontales
    const grieta = Math.abs(ruido(x, y, S, 6, 2, 6.6))
    let c = mezclar([104, 99, 93], [146, 140, 132], n * 0.6 + vetas * 0.4)
    if (grieta < 0.025) c = c.map((v) => v * 0.8)
    return c.map((v) => v * (0.94 + Math.random() * 0.1))
  })

  const arena = textura(S, (x, y) => {
    const n = ruido(x, y, S, 8, 3, 5.5) * 0.5 + 0.5
    return mezclar([186, 168, 120], [224, 208, 160], n).map((v) => v * (0.94 + Math.random() * 0.1))
  })

  const nieve = textura(S, (x, y) => {
    const n = ruido(x, y, S, 4, 4, 3.3) * 0.5 + 0.5
    return mezclar([212, 222, 236], [250, 252, 255], n)
  })

  // Mapa de normales para el agua
  const alt = new Float32Array(S * S)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) alt[y * S + x] = ruido(x, y, S, 6, 4, 9.9)
  const h = (x, y) => alt[((y + S) % S) * S + ((x + S) % S)]
  const aguaNormal = textura(
    S,
    (x, y) => {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 6
      const dy = (h(x, y + 1) - h(x, y - 1)) * 6
      const l = Math.hypot(dx, dy, 1)
      return [(-dx / l) * 127 + 128, (-dy / l) * 127 + 128, (1 / l) * 127 + 128]
    },
    false,
  )

  // Punto suave para partículas
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const punto = new THREE.CanvasTexture(c)

  return { hierba, roca, arena, nieve, aguaNormal, punto }
}
