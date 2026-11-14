import * as THREE from 'three'
import './estilos.css'
import { crearTexturas } from './mundo/texturas.js'
import { crearTerreno } from './mundo/terreno.js'
import { crearEntorno } from './mundo/entorno.js'
import { Colisiones, crearVegetacion } from './mundo/vegetacion.js'
import { crearPuntos, RADIO_ENTRADA } from './mundo/puntos.js'
import { Coche } from './coche.js'
import { CamaraPersecucion } from './camara.js'
import { crearHud } from './ui/hud.js'
import { crearMenu } from './ui/menu.js'

const $ = (id) => document.getElementById(id)
const siguienteFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))

function progreso(valor, texto) {
  $('carga-barra').style.width = `${valor * 100}%`
  $('carga-texto').textContent = texto
}

// Teclado: solo flechas y WASD
const mando = { adelante: false, atras: false, izquierda: false, derecha: false }
const TECLAS = {
  ArrowUp: 'adelante', KeyW: 'adelante',
  ArrowDown: 'atras', KeyS: 'atras',
  ArrowLeft: 'izquierda', KeyA: 'izquierda',
  ArrowRight: 'derecha', KeyD: 'derecha',
}
const pulsar = (v) => (e) => {
  const accion = TECLAS[e.code]
  if (!accion) return
  mando[accion] = v
  e.preventDefault()
}
window.addEventListener('keydown', pulsar(true))
window.addEventListener('keyup', pulsar(false))
window.addEventListener('blur', () => Object.keys(mando).forEach((k) => (mando[k] = false)))

async function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas: $('lienzo'), antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(innerWidth, innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.62
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 8000)

  progreso(0.05, 'Pintando texturas…')
  await siguienteFrame()
  const tex = crearTexturas()

  progreso(0.25, 'Levantando montañas…')
  await siguienteFrame()
  const terreno = crearTerreno(tex)
  scene.add(terreno.malla, terreno.agua)

  progreso(0.45, 'Encendiendo el sol…')
  await siguienteFrame()
  const entorno = crearEntorno(scene, renderer)

  progreso(0.55, 'Plantando árboles…')
  await siguienteFrame()
  const colisiones = new Colisiones()
  crearVegetacion(scene, terreno, colisiones)

  progreso(0.7, 'Construyendo edificios…')
  await siguienteFrame()
  const animarPuntos = crearPuntos(scene, terreno, colisiones)
  const coche = new Coche(scene, terreno, colisiones, tex.punto)
  const seguidor = new CamaraPersecucion(camara, terreno)

  progreso(0.8, 'Dibujando el mapa…')
  await siguienteFrame()
  const hud = crearHud(terreno)
  const menu = crearMenu()

  progreso(0.9, 'Compilando shaders…')
  await siguienteFrame()
  seguidor.orbitar(0, coche)
  entorno.seguir(coche.pos)
  await renderer.compileAsync(scene, camara)
  progreso(1, 'Listo')

  // Estados: inicio → jugando ⇄ menu
  let estado = 'inicio'
  let dentroDe = null

  const empezar = () => {
    if (estado !== 'inicio') return
    estado = 'jugando'
    $('inicio').classList.add('oculto')
    hud.mostrar(true)
  }
  $('btn-jugar').addEventListener('click', empezar)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') empezar()
  })

  function entrar(p) {
    estado = 'menu'
    dentroDe = p
    coche.vel = 0
    Object.keys(mando).forEach((k) => (mando[k] = false))
    hud.mostrar(false)
    menu.abrir(p, () => {
      // Al volver: el coche sale del punto mirando hacia fuera
      coche.colocar(p.entrada.x + p.dir.x * 11, p.entrada.z + p.dir.y * 11, Math.atan2(p.dir.x, p.dir.y))
      seguidor.saltar(coche)
      estado = 'jugando'
      hud.mostrar(true)
    })
  }

  function comprobarPuntos() {
    const p = terreno.puntos.find((q) => Math.hypot(q.entrada.x - coche.pos.x, q.entrada.z - coche.pos.z) < RADIO_ENTRADA)
    if (p && p !== dentroDe) entrar(p)
    else if (!p) dentroDe = null
  }

  // Acceso para pruebas automáticas: solo con ?debug en la URL
  if (new URLSearchParams(location.search).has('debug')) {
    window.__juego = { coche, terreno, estado: () => estado, saltar: () => seguidor.saltar(coche) }
  }

  window.addEventListener('resize', () => {
    camara.aspect = innerWidth / innerHeight
    camara.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
  })

  const reloj = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    const dt = Math.min(reloj.getDelta(), 0.05)
    const t = reloj.elapsedTime

    if (estado === 'jugando') {
      coche.update(dt, mando)
      comprobarPuntos()
      seguidor.seguir(dt, coche)
      hud.actualizar(dt, coche)
    } else if (estado === 'inicio') {
      seguidor.orbitar(t, coche)
    }

    coche.polvo.material.uniforms.escala.value = renderer.getPixelRatio() * innerHeight * 0.5
    entorno.seguir(coche.pos)
    terreno.animarAgua(t)
    animarPuntos(t)
    renderer.render(scene, camara)
  })

  $('carga').classList.add('salida')
  $('inicio').classList.remove('oculto')
  setTimeout(() => $('carga').remove(), 600)
}

iniciar().catch((e) => {
  console.error(e)
  progreso(1, 'No se ha podido iniciar el juego: ' + e.message)
  $('carga').classList.add('error')
})
