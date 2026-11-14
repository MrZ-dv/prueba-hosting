import { AGUA, TAM } from '../mundo/terreno.js'

const RADIO_VISTA = 160 // metros visibles en el minimapa desde el centro

// Color del minimapa parecido al del shader del terreno, con sombreado de relieve.
function colorTerreno(h, ny, luz) {
  let c
  if (h < AGUA) c = [40, 98, 130]
  else if (h < AGUA + 2.5) c = [208, 190, 140]
  else if (ny < 0.75) c = [128, 122, 116]
  else if (h > 60) c = [236, 242, 250]
  else c = [78 + h * 0.4, 128 + h * 0.2, 52]
  const k = h < AGUA ? 1 : 0.55 + luz * 0.6
  return c.map((v) => Math.min(255, v * k))
}

export function crearHud(terreno) {
  const $ = (id) => document.getElementById(id)
  const raiz = $('hud')
  const velNum = $('hud-vel')
  const velArco = $('hud-arco')
  const alt = $('hud-alt')
  const destino = $('hud-destino')
  const canvas = $('minimapa')
  const ctx = canvas.getContext('2d')
  const LARGO_ARCO = velArco.getTotalLength()
  velArco.style.strokeDasharray = LARGO_ARCO
  velArco.style.strokeDashoffset = LARGO_ARCO

  // Imagen base del mapa, calculada una vez
  const N = 256
  const base = document.createElement('canvas')
  base.width = base.height = N
  const bctx = base.getContext('2d')
  const img = bctx.createImageData(N, N)
  const paso = TAM / N
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -TAM / 2 + (i + 0.5) * paso
      const z = -TAM / 2 + (j + 0.5) * paso
      const h = terreno.altura(x, z)
      const dx = terreno.altura(x + paso, z) - h
      const dz = terreno.altura(x, z + paso) - h
      const l = Math.hypot(dx, paso, dz)
      const ny = paso / l
      const luz = Math.max(0, (-dx * 0.6 - dz * 0.6 + paso) / l)
      const [r, g, b] = colorTerreno(h, ny, luz)
      const k = (j * N + i) * 4
      img.data[k] = r
      img.data[k + 1] = g
      img.data[k + 2] = b
      img.data[k + 3] = 255
    }
  }
  bctx.putImageData(img, 0, 0)

  function ajustarTamano() {
    const lado = canvas.clientWidth * Math.min(2, devicePixelRatio)
    if (canvas.width !== lado) canvas.width = canvas.height = lado
  }

  function dibujarMinimapa(coche) {
    ajustarTamano()
    const W = canvas.width
    const ppm = W / 2 / RADIO_VISTA
    // Rotación para que la dirección del coche quede hacia arriba
    const giro = -Math.PI / 2 - Math.atan2(Math.cos(coche.yaw), Math.sin(coche.yaw))

    ctx.clearRect(0, 0, W, W)
    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = '#1b3b4c'
    ctx.fillRect(0, 0, W, W)
    ctx.translate(W / 2, W / 2)
    ctx.rotate(giro)
    ctx.scale(ppm, ppm)
    ctx.translate(-coche.pos.x, -coche.pos.z)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(base, -TAM / 2, -TAM / 2, TAM, TAM)

    for (const p of terreno.puntos) {
      ctx.beginPath()
      ctx.arc(p.entrada.x, p.entrada.z, 7 / ppm * (W / 180), 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.lineWidth = 2 / ppm * (W / 180)
      ctx.strokeStyle = '#fff'
      ctx.stroke()
    }
    ctx.restore()

    // Coche (siempre en el centro, apuntando arriba)
    const s = W / 180
    ctx.save()
    ctx.translate(W / 2, W / 2)
    ctx.beginPath()
    ctx.moveTo(0, -9 * s)
    ctx.lineTo(6 * s, 7 * s)
    ctx.lineTo(0, 4 * s)
    ctx.lineTo(-6 * s, 7 * s)
    ctx.closePath()
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,.6)'
    ctx.shadowBlur = 6 * s
    ctx.fill()
    ctx.restore()

    // Norte
    const nx = Math.cos(giro - Math.PI / 2) * (W / 2 - 14 * s)
    const ny = Math.sin(giro - Math.PI / 2) * (W / 2 - 14 * s)
    ctx.font = `700 ${12 * s}px Rajdhani, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffd24d'
    ctx.fillText('N', W / 2 + nx, W / 2 + ny)
  }

  function actualizarDestino(coche) {
    let mejor = null
    let dmin = Infinity
    for (const p of terreno.puntos) {
      const d = Math.hypot(p.entrada.x - coche.pos.x, p.entrada.z - coche.pos.z)
      if (d < dmin) {
        dmin = d
        mejor = p
      }
    }
    if (!mejor) return
    // Ángulo del destino respecto a hacia dónde mira el coche (0 = de frente)
    const rumbo = Math.atan2(mejor.entrada.x - coche.pos.x, mejor.entrada.z - coche.pos.z)
    let rel = coche.yaw - rumbo
    rel = Math.atan2(Math.sin(rel), Math.cos(rel))
    destino.style.setProperty('--color', mejor.color)
    destino.querySelector('.destino-icono').textContent = mejor.icono
    destino.querySelector('.destino-nombre').textContent = mejor.nombre
    destino.querySelector('.destino-dist').textContent = `${Math.round(dmin)} m`
    destino.querySelector('.destino-flecha').style.transform = `rotate(${rel}rad)`
  }

  let t = 0
  return {
    mostrar(v) {
      raiz.classList.toggle('oculto', !v)
    },
    actualizar(dt, coche) {
      const kmh = coche.kmh
      velNum.textContent = Math.round(kmh)
      velArco.style.strokeDashoffset = LARGO_ARCO * (1 - Math.min(1, kmh / 130))
      alt.textContent = `${Math.round(coche.pos.y)} m`
      t += dt
      if (t > 0.1) {
        t = 0
        actualizarDestino(coche)
      }
      dibujarMinimapa(coche)
    },
  }
}
