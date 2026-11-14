import * as THREE from 'three'

export const RADIO_ENTRADA = 6

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra })

function caja(grupo, w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y + h / 2, z)
  m.castShadow = m.receiveShadow = true
  grupo.add(m)
  return m
}

function cilindro(grupo, r, h, mat, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)
  m.position.set(x, y + h / 2, z)
  m.castShadow = m.receiveShadow = true
  grupo.add(m)
  return m
}

function texturaRayas(a, b) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 8
  const ctx = c.getContext('2d')
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? a : b
    ctx.fillRect(i * 16, 0, 16, 8)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Edificios hechos con primitivas. La fachada mira a +z (hacia la entrada).
const EDIFICIOS = {
  garaje(g, color) {
    caja(g, 11, 5.5, 9, std(0xe8dcc6))
    caja(g, 12, 0.6, 10, std(0x5b4636), 0, 5.5)
    caja(g, 7, 4.2, 0.2, std(color, { metalness: 0.3, roughness: 0.5 }), 0, 0, 4.55)
    for (let i = 0; i < 6; i++) caja(g, 7, 0.06, 0.25, std(0x000000, { transparent: true, opacity: 0.25 }), 0, 0.6 + i * 0.6, 4.6)
  },
  tienda(g, color) {
    caja(g, 10, 5, 8, std(0xf5f5f0))
    caja(g, 10.4, 0.4, 8.4, std(0x37474f), 0, 5)
    const toldo = caja(g, 10.2, 0.15, 3, std(0xffffff, { map: texturaRayas(color, '#ffffff') }), 0, 3.6, 5.3)
    toldo.rotation.x = 0.35
    caja(g, 7, 2.2, 0.15, std(0x9fd3ff, { metalness: 0.6, roughness: 0.1 }), 0, 0.8, 4.05)
    caja(g, 5, 1.1, 0.3, std(color, { emissive: color, emissiveIntensity: 0.4 }), 0, 5.6, 3.6)
  },
  taller(g, color) {
    caja(g, 12, 6.5, 10, std(0x7d8a99))
    caja(g, 12.4, 0.5, 10.4, std(0x2f3a45), 0, 6.5)
    caja(g, 7.5, 5, 0.2, std(0x1f2429), 0, 0, 5.05)
    caja(g, 12.2, 0.5, 0.3, std(color), 0, 5.6, 5.1)
    cilindro(g, 0.6, 4, std(0x555555), 4, 6.5, -3)
    for (let i = 0; i < 3; i++) cilindro(g, 0.7, 1.2, std(0xc0392b, { metalness: 0.4 }), -7.2, 0, -2 + i * 1.6)
  },
  gasolinera(g, color) {
    for (const [x, z] of [[-5, -2.5], [5, -2.5], [-5, 2.5], [5, 2.5]]) cilindro(g, 0.3, 5.5, std(0xdddddd), x, 0, z)
    caja(g, 13, 0.8, 8, std(color, { emissive: color, emissiveIntensity: 0.15 }), 0, 5.5)
    caja(g, 13.2, 0.2, 8.2, std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 0, 5.4)
    for (const x of [-2.2, 2.2]) {
      caja(g, 1.6, 0.3, 1, std(0x888888), x, 0)
      caja(g, 0.9, 1.8, 0.7, std(0xf2f2f2), x, 0.3)
      caja(g, 0.95, 0.4, 0.75, std(color), x, 2.1)
    }
    caja(g, 6, 3.5, 4, std(0xf0ede6), 0, 0, -6.5)
  },
  supabase(g, color) {
    caja(g, 7, 0.5, 7, std(0x2a2f36))
    caja(g, 3.5, 9, 3.5, std(0x1c1f24, { metalness: 0.5, roughness: 0.4 }), 0, 0.5)
    for (let i = 0; i < 7; i++) caja(g, 3.6, 0.12, 3.6, std(color, { emissive: color, emissiveIntensity: 1.2 }), 0, 1.4 + i * 1.15)
    cilindro(g, 0.08, 5, std(0xbbbbbb, { metalness: 1, roughness: 0.3 }), 0, 9.5)
    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color }))
    luz.position.y = 14.6
    luz.name = 'baliza'
    g.add(luz)
  },
}

function etiqueta(p) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(12,16,24,0.78)'
  ctx.beginPath()
  ctx.roundRect(8, 16, 496, 96, 48)
  ctx.fill()
  ctx.strokeStyle = p.color
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.font = '600 48px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`${p.icono}  ${p.nombre}`, 256, 66)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false }))
  s.scale.set(16, 4, 1)
  return s
}

function degradado() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, '#000')
  g.addColorStop(1, '#fff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  return new THREE.CanvasTexture(c)
}

// Crea edificio, anillo de entrada, haz de luz y etiqueta para cada punto.
export function crearPuntos(scene, terreno, colisiones) {
  const alpha = degradado()
  const animables = []

  for (const p of terreno.puntos) {
    const color = new THREE.Color(p.color)

    const edificio = new THREE.Group()
    EDIFICIOS[p.tipo](edificio, color)
    edificio.position.set(p.x, p.y, p.z)
    edificio.rotation.y = Math.atan2(p.dir.x, p.dir.y)
    scene.add(edificio)
    colisiones.agregar(p.x, p.z, 6.5)

    const base = new THREE.Group()
    base.position.set(p.entrada.x, p.y + 0.08, p.entrada.z)
    scene.add(base)

    const anillo = new THREE.Mesh(
      new THREE.RingGeometry(RADIO_ENTRADA - 0.6, RADIO_ENTRADA, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    const disco = new THREE.Mesh(
      new THREE.CircleGeometry(RADIO_ENTRADA - 0.6, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }),
    )
    const haz = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIO_ENTRADA - 0.3, RADIO_ENTRADA, 14, 48, 1, true).translate(0, 7, 0),
      new THREE.MeshBasicMaterial({
        color, alphaMap: alpha, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    )
    const cartel = etiqueta(p)
    cartel.position.y = 12
    base.add(anillo, disco, haz, cartel)

    animables.push({ anillo, haz, cartel, baliza: edificio.getObjectByName('baliza'), fase: Math.random() * 6 })
  }

  return function animar(t) {
    for (const a of animables) {
      const k = Math.sin(t * 2.2 + a.fase) * 0.5 + 0.5
      a.anillo.scale.setScalar(1 + k * 0.06)
      a.haz.material.opacity = 0.2 + k * 0.2
      a.cartel.position.y = 12 + Math.sin(t * 1.4 + a.fase) * 0.4
      if (a.baliza) a.baliza.visible = Math.sin(t * 4) > 0
    }
  }
}
