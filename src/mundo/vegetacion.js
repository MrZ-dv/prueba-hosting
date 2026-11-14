import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { AGUA, LIMITE } from './terreno.js'

// Rejilla espacial con círculos de colisión (árboles, rocas, edificios).
export class Colisiones {
  constructor(celda = 20) {
    this.celda = celda
    this.mapa = new Map()
  }
  clave(i, j) {
    return i * 100000 + j
  }
  agregar(x, z, r) {
    const i = Math.floor(x / this.celda)
    const j = Math.floor(z / this.celda)
    const k = this.clave(i, j)
    if (!this.mapa.has(k)) this.mapa.set(k, [])
    this.mapa.get(k).push({ x, z, r })
  }
  // Empuja `pos` fuera de los obstáculos cercanos. Devuelve true si ha chocado.
  resolver(pos, radio) {
    const i0 = Math.floor(pos.x / this.celda)
    const j0 = Math.floor(pos.z / this.celda)
    let choque = false
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      for (let j = j0 - 1; j <= j0 + 1; j++) {
        const lista = this.mapa.get(this.clave(i, j))
        if (!lista) continue
        for (const o of lista) {
          const dx = pos.x - o.x
          const dz = pos.z - o.z
          const min = o.r + radio
          const d2 = dx * dx + dz * dz
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.001
            pos.x = o.x + (dx / d) * min
            pos.z = o.z + (dz / d) * min
            choque = true
          }
        }
      }
    }
    return choque
  }
}

function pino() {
  const tronco = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 6).translate(0, 1.1, 0)
  const copa = mergeGeometries([
    new THREE.ConeGeometry(2.3, 3.6, 7).translate(0, 3.4, 0),
    new THREE.ConeGeometry(1.8, 3.0, 7).translate(0, 4.9, 0),
    new THREE.ConeGeometry(1.2, 2.4, 7).translate(0, 6.3, 0),
  ])
  return { tronco, copa }
}

function frondoso() {
  const tronco = new THREE.CylinderGeometry(0.28, 0.42, 3, 6).translate(0, 1.5, 0)
  const copa = mergeGeometries([
    new THREE.IcosahedronGeometry(2.4, 1).translate(0, 4.2, 0),
    new THREE.IcosahedronGeometry(1.7, 1).translate(1.3, 3.6, 0.6),
    new THREE.IcosahedronGeometry(1.6, 1).translate(-1.1, 3.8, -0.7),
  ])
  return { tronco, copa }
}

function roca() {
  const g = new THREE.DodecahedronGeometry(1.4, 1)
  const p = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const k = 0.75 + ((Math.sin(v.x * 4.1) + Math.cos(v.z * 3.7) + Math.sin(v.y * 5.3)) / 3 + 1) * 0.25
    p.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k)
  }
  g.computeVertexNormals()
  return g
}

// Coloca árboles y rocas con InstancedMesh (cientos de objetos con pocas llamadas de dibujo).
export function crearVegetacion(scene, terreno, colisiones) {
  const libre = (x, z) =>
    Math.hypot(x, z) > 32 &&
    terreno.puntos.every((p) => Math.hypot(x - p.centro.x, z - p.centro.z) > 34)

  const n = new THREE.Vector3()
  const elegir = (cantidad, filtro) => {
    const lista = []
    for (let t = 0; t < cantidad * 12 && lista.length < cantidad; t++) {
      const x = (Math.random() * 2 - 1) * LIMITE
      const z = (Math.random() * 2 - 1) * LIMITE
      const h = terreno.altura(x, z)
      terreno.normal(x, z, n)
      if (libre(x, z) && filtro(h, n.y, x, z)) lista.push({ x, z, h, s: 0.75 + Math.random() * 0.7, r: Math.random() * Math.PI * 2 })
    }
    return lista
  }

  // Bosques más densos donde el ruido lo indique
  const bosque = (x, z) => Math.sin(x * 0.013) * Math.cos(z * 0.011) + Math.sin((x + z) * 0.007) > -0.2

  const pinos = elegir(650, (h, ny, x, z) => h > AGUA + 2 && h < 60 && ny > 0.86 && bosque(x, z))
  const frondosos = elegir(300, (h, ny, x, z) => h > AGUA + 1.5 && h < 28 && ny > 0.9 && bosque(-z, x))
  const rocas = elegir(260, (h, ny) => h > AGUA - 1 && ny > 0.6)

  const matTronco = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1, flatShading: true })
  const matCopa = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true })
  const matRoca = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true })

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()
  const eje = new THREE.Vector3(0, 1, 0)
  const color = new THREE.Color()

  const instanciar = (geo, mat, lista, colorear, hundir = 0.2) => {
    const im = new THREE.InstancedMesh(geo, mat, lista.length)
    lista.forEach((o, i) => {
      q.setFromAxisAngle(eje, o.r)
      s.setScalar(o.s)
      p.set(o.x, o.h - hundir * o.s, o.z)
      im.setMatrixAt(i, m.compose(p, q, s))
      if (colorear) im.setColorAt(i, colorear(color, o))
    })
    im.castShadow = true
    im.receiveShadow = true
    scene.add(im)
    return im
  }

  const verdePino = (c) => c.setHSL(0.3 + Math.random() * 0.05, 0.45, 0.2 + Math.random() * 0.08)
  const verdeHoja = (c) => c.setHSL(0.22 + Math.random() * 0.08, 0.5, 0.3 + Math.random() * 0.1)
  const gris = (c) => c.setHSL(0.08, 0.05, 0.38 + Math.random() * 0.15)

  const gp = pino()
  instanciar(gp.tronco, matTronco, pinos)
  instanciar(gp.copa, matCopa, pinos, verdePino)
  const gf = frondoso()
  instanciar(gf.tronco, matTronco, frondosos)
  instanciar(gf.copa, matCopa, frondosos, verdeHoja)
  instanciar(roca(), matRoca, rocas, gris, 0.35)

  for (const o of pinos) colisiones.agregar(o.x, o.z, 0.5 * o.s)
  for (const o of frondosos) colisiones.agregar(o.x, o.z, 0.6 * o.s)
  for (const o of rocas) colisiones.agregar(o.x, o.z, 1.3 * o.s)
}
