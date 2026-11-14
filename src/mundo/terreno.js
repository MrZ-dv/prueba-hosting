import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

export const TAM = 1000 // lado del mapa en metros
export const LIMITE = 470 // hasta dónde puede ir el coche
export const AGUA = -2 // nivel del agua

const perlin = new ImprovedNoise()
const suave = THREE.MathUtils.smoothstep

export const PUNTOS = [
  { nombre: 'Garaje', icono: '🏠', color: '#f4b400', tipo: 'garaje' },
  { nombre: 'Tienda', icono: '🛒', color: '#4c8dff', tipo: 'tienda' },
  { nombre: 'Taller', icono: '🔧', color: '#b26bff', tipo: 'taller' },
  { nombre: 'Gasolinera', icono: '⛽', color: '#ff6a3d', tipo: 'gasolinera' },
  { nombre: 'Estado Supabase', icono: '🗄️', color: '#3ecf8e', tipo: 'supabase' },
]

// Crea un terreno distinto en cada carga: colinas, lagos, montañas y un valle llano en el centro.
export function crearTerreno(tex) {
  const o = Array.from({ length: 6 }, () => Math.random() * 1000)

  const fbm = (x, z, oct, s) => {
    let t = 0, a = 1, n = 0
    for (let i = 0; i < oct; i++) {
      t += perlin.noise(x, z, s + i * 3.7) * a
      n += a
      a *= 0.5
      x *= 2
      z *= 2
    }
    return t / n
  }
  const crestas = (x, z, oct, s) => {
    let t = 0, a = 1, n = 0
    for (let i = 0; i < oct; i++) {
      const v = 1 - Math.abs(perlin.noise(x, z, s + i * 5.1))
      t += v * v * a
      n += a
      a *= 0.5
      x *= 2
      z *= 2
    }
    return t / n
  }

  function alturaBase(x, z) {
    const d = Math.hypot(x, z)
    const colinas = fbm(x * 0.0045 + o[0], z * 0.0045 + o[1], 4, 0.37) * 26
    const r = crestas(x * 0.0028 + o[2], z * 0.0028 + o[3], 5, 0.61)
    const zona = suave(fbm(x * 0.0013 + o[4], z * 0.0013 + o[5], 2, 0.13) + 0.1, 0, 0.35)
    const lejos = suave(d, 90, 380)
    let h = colinas + Math.pow(r, 2.2) * 125 * Math.max(zona, lejos * 0.8)
    h += suave(Math.max(Math.abs(x), Math.abs(z)), 400, 495) * 80 // montañas que cierran el mapa
    return 3 + (h - 3) * suave(d, 25, 110) // valle de salida
  }

  // Puntos de interés en zonas razonablemente llanas y separadas entre sí
  const puntos = []
  let intentos = 0
  while (puntos.length < PUNTOS.length && intentos++ < 20000) {
    const relaja = intentos > 10000
    const ang = Math.random() * Math.PI * 2
    const rad = 120 + Math.random() * 240
    const x = Math.cos(ang) * rad
    const z = Math.sin(ang) * rad
    const h = alturaBase(x, z)
    const pendiente = Math.abs(alturaBase(x + 8, z) - alturaBase(x - 8, z)) + Math.abs(alturaBase(x, z + 8) - alturaBase(x, z - 8))
    if (h < AGUA + 3 || h > (relaja ? 70 : 35) || pendiente > (relaja ? 20 : 8)) continue
    if (puntos.some((p) => Math.hypot(p.x - x, p.z - z) < (relaja ? 110 : 170))) continue
    const dir = new THREE.Vector2(-x, -z).normalize().rotateAround(new THREE.Vector2(), (Math.random() - 0.5) * 0.8)
    const def = PUNTOS[puntos.length]
    puntos.push({
      ...def,
      x, z, dir,
      centro: { x: x + dir.x * 7, z: z + dir.y * 7 },
      entrada: { x: x + dir.x * 15, z: z + dir.y * 15 },
    })
  }
  for (const p of puntos) p.y = alturaBase(p.centro.x, p.centro.z)

  // Altura final: se allana el suelo alrededor de cada punto
  function altura(x, z) {
    let h = alturaBase(x, z)
    for (const p of puntos) {
      const d = Math.hypot(x - p.centro.x, z - p.centro.z)
      if (d < 48) h = p.y + (h - p.y) * suave(d, 22, 48)
    }
    return h
  }

  function normal(x, z, destino = new THREE.Vector3()) {
    const e = 1
    return destino.set(altura(x - e, z) - altura(x + e, z), 2 * e, altura(x, z - e) - altura(x, z + e)).normalize()
  }

  // Malla
  const SEG = 256
  const geo = new THREE.PlaneGeometry(TAM, TAM, SEG, SEG)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, altura(pos.getX(i), pos.getZ(i)))
  geo.computeVertexNormals()

  const malla = new THREE.Mesh(geo, materialTerreno(tex))
  malla.receiveShadow = true

  // Agua
  tex.aguaNormal.repeat.set(60, 60)
  const agua = new THREE.Mesh(
    new THREE.PlaneGeometry(TAM * 3, TAM * 3).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x1c5d78,
      roughness: 0.06,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
      normalMap: tex.aguaNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
  )
  agua.position.y = AGUA
  agua.receiveShadow = true

  const animarAgua = (t) => tex.aguaNormal.offset.set(t * 0.004, t * 0.0025)

  return { malla, agua, altura, normal, puntos, animarAgua }
}

// Material del terreno: mezcla hierba, arena, roca y nieve según altura y pendiente.
function materialTerreno(tex) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      tHierba: { value: tex.hierba },
      tRoca: { value: tex.roca },
      tArena: { value: tex.arena },
      tNieve: { value: tex.nieve },
      uAgua: { value: AGUA },
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTPos;\nvarying vec3 vTNor;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvTPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvTNor = normalize(mat3(modelMatrix) * normal);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D tHierba; uniform sampler2D tRoca; uniform sampler2D tArena; uniform sampler2D tNieve;
uniform float uAgua;
varying vec3 vTPos; varying vec3 vTNor;`,
      )
      .replace(
        '#include <map_fragment>',
        `
  vec3 tN = normalize(vTNor);
  vec2 tUv = vTPos.xz * 0.08;
  vec3 tMacro = texture2D(tHierba, vTPos.xz * 0.009).rgb;
  vec3 tHie = mix(texture2D(tHierba, tUv).rgb, tMacro, 0.45);
  vec3 tAre = texture2D(tArena, tUv * 1.3).rgb;
  vec3 tPeso = pow(abs(tN), vec3(4.0)); tPeso /= (tPeso.x + tPeso.y + tPeso.z);
  vec3 tRoc = texture2D(tRoca, vTPos.zy * 0.09).rgb * tPeso.x
            + texture2D(tRoca, vTPos.xz * 0.09).rgb * tPeso.y
            + texture2D(tRoca, vTPos.xy * 0.09).rgb * tPeso.z;
  tRoc *= 0.85 + tMacro.g * 0.4;
  vec3 tNie = texture2D(tNieve, tUv).rgb;
  float tPend = 1.0 - clamp(tN.y, 0.0, 1.0);
  float tVar = (tMacro.g - 0.45) * 2.0;
  float wAre = 1.0 - smoothstep(uAgua + 0.6, uAgua + 3.2, vTPos.y + tVar);
  float wRoc = smoothstep(0.2, 0.38, tPend + tVar * 0.08);
  float wNie = smoothstep(56.0, 66.0, vTPos.y + tVar * 10.0) * (1.0 - smoothstep(0.3, 0.55, tPend));
  vec3 tCol = mix(tHie, tAre, wAre);
  tCol = mix(tCol, tRoc, wRoc);
  tCol = mix(tCol, tNie, wNie);
  diffuseColor.rgb *= tCol;
`,
      )
  }
  return mat
}
