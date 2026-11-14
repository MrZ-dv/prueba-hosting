import * as THREE from 'three'
import { AGUA, LIMITE } from './mundo/terreno.js'

const RADIO_RUEDA = 0.4
const BATALLA = 2.7 // distancia entre ejes
const VEL_MAX = 34 // m/s (~122 km/h)
const VEL_ATRAS = 9

// Modelo de coche hecho por código. Mira hacia +z.
function crearModelo() {
  const coche = new THREE.Group()
  const pintura = new THREE.MeshPhysicalMaterial({ color: 0xd7263d, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 })
  const cristal = new THREE.MeshPhysicalMaterial({ color: 0x0b1620, metalness: 0.3, roughness: 0.04, clearcoat: 1 })
  const negro = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.75 })
  const cromo = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 1, roughness: 0.18 })
  const faro = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: 2 })
  const piloto = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 1.2 })

  const extruir = (puntos, ancho, bisel) => {
    const s = new THREE.Shape()
    s.moveTo(...puntos[0])
    for (const p of puntos.slice(1)) p.length === 2 ? s.lineTo(...p) : s.quadraticCurveTo(...p)
    const g = new THREE.ExtrudeGeometry(s, { depth: ancho, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 4, curveSegments: 12 })
    g.translate(0, 0, -ancho / 2)
    g.rotateY(-Math.PI / 2) // el perfil (eje x) pasa a ser el eje z del coche
    return g
  }

  const malla = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = m.receiveShadow = true
    coche.add(m)
    return m
  }

  // Carrocería (perfil lateral)
  malla(
    extruir(
      [[-2.1, 0.32], [2.0, 0.32], [2.25, 0.38, 2.25, 0.62], [2.2, 0.82], [1.95, 0.98, 1.1, 1.0], [-1.6, 1.04], [-2.1, 1.04, -2.15, 0.82], [-2.1, 0.32]],
      1.7,
      0.12,
    ),
    pintura,
  )
  // Cabina de cristal y techo
  malla(extruir([[1.15, 1.0], [0.3, 1.56], [-0.95, 1.58], [-1.6, 1.02]], 1.52, 0.05), cristal)
  const techo = malla(new THREE.BoxGeometry(1.5, 0.07, 1.2), pintura)
  techo.position.set(0, 1.64, -0.32)

  // Paragolpes, rejilla y luces
  const bloque = (w, h, d, mat, x, y, z) => {
    const m = malla(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    return m
  }
  bloque(1.9, 0.22, 0.25, negro, 0, 0.4, 2.3)
  bloque(1.9, 0.22, 0.25, negro, 0, 0.4, -2.22)
  bloque(0.9, 0.18, 0.05, negro, 0, 0.62, 2.36)
  for (const x of [-0.62, 0.62]) {
    bloque(0.42, 0.14, 0.06, faro, x, 0.76, 2.31)
    bloque(0.42, 0.14, 0.06, piloto, x, 0.82, -2.24)
  }
  // Retrovisores
  for (const x of [-0.98, 0.98]) bloque(0.18, 0.12, 0.28, pintura, x, 1.05, 0.95)

  // Ruedas: un pivote (dirección) que contiene el giro (rodar)
  const ruedas = []
  const geoNeum = new THREE.CylinderGeometry(RADIO_RUEDA, RADIO_RUEDA, 0.3, 24).rotateZ(Math.PI / 2)
  const geoLlanta = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 10).rotateZ(Math.PI / 2)
  const geoRadio = new THREE.BoxGeometry(0.33, 0.06, 0.42)
  for (const [x, z, delantera] of [[-0.9, 1.35, true], [0.9, 1.35, true], [-0.9, -1.35, false], [0.9, -1.35, false]]) {
    const pivote = new THREE.Group()
    pivote.position.set(x, RADIO_RUEDA, z)
    const giro = new THREE.Group()
    const neum = new THREE.Mesh(geoNeum, negro)
    const llanta = new THREE.Mesh(geoLlanta, cromo)
    const radio = new THREE.Mesh(geoRadio, negro)
    neum.castShadow = true
    giro.add(neum, llanta, radio)
    pivote.add(giro)
    coche.add(pivote)
    ruedas.push({ pivote, giro, delantera })
  }

  return { coche, ruedas }
}

// Partículas de polvo detrás de las ruedas
function crearPolvo(scene, texPunto) {
  const N = 160
  const pos = new Float32Array(N * 3).fill(-9999)
  const vida = new Float32Array(N)
  const vel = Array.from({ length: N }, () => new THREE.Vector3())
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aVida', new THREE.BufferAttribute(vida, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: texPunto }, color: { value: new THREE.Color(0xcdbb9c) }, escala: { value: 300 } },
    vertexShader: `attribute float aVida; varying float vA; uniform float escala;
      void main(){ vA = aVida; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (1.0 + (1.0 - aVida) * 3.5) * escala / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D mapa; uniform vec3 color; varying float vA;
      void main(){ float a = texture2D(mapa, gl_PointCoord).a * vA * 0.4; if (a < 0.01) discard; gl_FragColor = vec4(color, a); }`,
    transparent: true,
    depthWrite: false,
  })
  const puntos = new THREE.Points(geo, mat)
  puntos.frustumCulled = false
  scene.add(puntos)
  let siguiente = 0

  return {
    material: mat,
    emitir(p, impulso) {
      const i = siguiente++ % N
      pos.set([p.x, p.y, p.z], i * 3)
      vida[i] = 1
      vel[i].copy(impulso)
    },
    actualizar(dt) {
      for (let i = 0; i < N; i++) {
        if (vida[i] <= 0) continue
        vida[i] = Math.max(0, vida[i] - dt * 1.1)
        pos[i * 3] += vel[i].x * dt
        pos[i * 3 + 1] += vel[i].y * dt
        pos[i * 3 + 2] += vel[i].z * dt
        vel[i].multiplyScalar(1 - dt * 1.5)
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.aVida.needsUpdate = true
    },
  }
}

export class Coche {
  constructor(scene, terreno, colisiones, texPunto) {
    this.terreno = terreno
    this.colisiones = colisiones
    const { coche, ruedas } = crearModelo()
    this.modelo = coche
    this.ruedas = ruedas
    scene.add(coche)
    this.polvo = crearPolvo(scene, texPunto)

    this.pos = new THREE.Vector3()
    this.yaw = 0
    this.vel = 0
    this.direccion = 0
    this.choque = 0
    this._m = new THREE.Matrix4()
    this._q = new THREE.Quaternion()
    this._f = new THREE.Vector3()
    this._r = new THREE.Vector3()
    this._u = new THREE.Vector3()
    this._sig = new THREE.Vector3()
    this.colocar(0, 0, 0)
  }

  get adelante() {
    return this._f.set(Math.sin(this.yaw), 0, Math.cos(this.yaw))
  }

  get kmh() {
    return Math.abs(this.vel) * 3.6
  }

  colocar(x, z, yaw) {
    this.pos.set(x, this.terreno.altura(x, z), z)
    this.yaw = yaw
    this.vel = 0
    this.orientar(1, true)
  }

  // Alinea el coche con el terreno usando la altura bajo cada eje.
  orientar(dt, inmediato = false) {
    const a = this.terreno.altura
    const { x, z } = this.pos
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw)
    const fx = sy * 1.35, fz = cy * 1.35
    const rx = cy * 0.9, rz = -sy * 0.9
    const hF = a(x + fx, z + fz), hB = a(x - fx, z - fz)
    const hR = a(x + rx, z + rz), hL = a(x - rx, z - rz)

    const f = this._f.set(sy * BATALLA, hF - hB, cy * BATALLA).normalize()
    const r = this._r.set(cy * 1.8, hR - hL, -sy * 1.8).normalize()
    const u = this._u.crossVectors(f, r).normalize()
    r.crossVectors(u, f).normalize()
    this._q.setFromRotationMatrix(this._m.makeBasis(r, u, f))

    const y = Math.max((hF + hB + hR + hL) / 4, a(x, z) - 0.1)
    if (inmediato) {
      this.modelo.quaternion.copy(this._q)
      this.pos.y = y
    } else {
      this.modelo.quaternion.slerp(this._q, 1 - Math.exp(-14 * dt))
      this.pos.y += (y - this.pos.y) * (1 - Math.exp(-20 * dt))
    }
    this.modelo.position.copy(this.pos)
    return (hF - hB) / Math.hypot(BATALLA, hF - hB) // seno de la pendiente
  }

  update(dt, mando) {
    const acelera = mando.adelante
    const frena = mando.atras
    const giro = (mando.izquierda ? 1 : 0) - (mando.derecha ? 1 : 0)

    // Motor, freno y marcha atrás
    if (acelera) this.vel += 22 * (1 - Math.max(0, this.vel) / VEL_MAX) * dt + (this.vel < 0 ? 30 * dt : 0)
    else if (frena) this.vel -= this.vel > 0.5 ? 38 * dt : 10 * (1 + this.vel / VEL_ATRAS) * dt
    else this.vel -= Math.sign(this.vel) * Math.min(Math.abs(this.vel), 5 * dt)
    this.vel = THREE.MathUtils.clamp(this.vel, -VEL_ATRAS, VEL_MAX)

    // Dirección: menos ángulo a más velocidad
    const maxGiro = 0.6 - 0.38 * Math.min(1, Math.abs(this.vel) / VEL_MAX)
    this.direccion += (giro * maxGiro - this.direccion) * (1 - Math.exp(-8 * dt))
    this.yaw += (this.vel / BATALLA) * Math.tan(this.direccion) * dt

    // Movimiento con agua, límites y colisiones
    const f = this.adelante
    const sig = this._sig.copy(this.pos).addScaledVector(f, this.vel * dt)
    sig.x = THREE.MathUtils.clamp(sig.x, -LIMITE, LIMITE)
    sig.z = THREE.MathUtils.clamp(sig.z, -LIMITE, LIMITE)
    const prof = AGUA - this.terreno.altura(sig.x, sig.z)
    if (prof > 1.3) {
      sig.copy(this.pos) // agua demasiado profunda
      this.vel *= -0.2
    } else if (prof > 0) {
      this.vel *= 1 - Math.min(1, 2.5 * dt)
    }
    if (this.colisiones.resolver(sig, 1.15)) {
      if (Math.abs(this.vel) > 6) this.choque = 0.35
      this.vel *= 0.5
    }
    this.pos.x = sig.x
    this.pos.z = sig.z

    // La pendiente frena al subir y acelera al bajar, pero el motor siempre puede subir
    const seno = this.orientar(dt)
    this.vel -= 9.8 * 0.85 * seno * dt

    // Ruedas
    for (const r of this.ruedas) {
      r.giro.rotation.x += (this.vel * dt) / RADIO_RUEDA
      if (r.delantera) r.pivote.rotation.y = this.direccion
    }

    // Polvo
    this.choque = Math.max(0, this.choque - dt)
    if (Math.abs(this.vel) > 7 && prof < 0) {
      for (const lado of [-0.9, 0.9]) {
        const p = new THREE.Vector3(lado, 0.15, -1.4).applyQuaternion(this.modelo.quaternion).add(this.pos)
        const imp = new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2).addScaledVector(f, -this.vel * 0.15)
        if (Math.random() < Math.min(1, Math.abs(this.vel) / 25)) this.polvo.emitir(p, imp)
      }
    }
    this.polvo.actualizar(dt)
  }
}
