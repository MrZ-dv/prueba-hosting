import { leerSupabase } from '../supabase.js'

// Contenido de ejemplo de cada menú. Los botones son decorativos (es una prueba).
const CONTENIDO = {
  garaje: {
    subtitulo: 'Tu vehículo',
    html: `
      <div class="tarjetas">
        <div class="tarjeta"><span class="etq">Velocidad máx.</span><b>122 km/h</b><div class="barra"><i style="width:72%"></i></div></div>
        <div class="tarjeta"><span class="etq">Aceleración</span><b>6,1 s</b><div class="barra"><i style="width:58%"></i></div></div>
        <div class="tarjeta"><span class="etq">Agarre</span><b>B+</b><div class="barra"><i style="width:66%"></i></div></div>
      </div>
      <div class="colores">
        <span>Pintura</span>
        <button class="muestra" style="--c:#d7263d" data-demo></button>
        <button class="muestra" style="--c:#1e88e5" data-demo></button>
        <button class="muestra" style="--c:#43a047" data-demo></button>
        <button class="muestra" style="--c:#fdd835" data-demo></button>
        <button class="muestra" style="--c:#212121" data-demo></button>
      </div>`,
  },
  tienda: {
    subtitulo: 'Mejoras y accesorios',
    html: `
      <div class="tarjetas">
        <div class="tarjeta producto"><span class="emoji">🛞</span><b>Neumáticos todoterreno</b><span class="precio">1.200 ◈</span><button class="btn-sec" data-demo>Comprar</button></div>
        <div class="tarjeta producto"><span class="emoji">💡</span><b>Faros LED</b><span class="precio">450 ◈</span><button class="btn-sec" data-demo>Comprar</button></div>
        <div class="tarjeta producto"><span class="emoji">🎨</span><b>Vinilo deportivo</b><span class="precio">800 ◈</span><button class="btn-sec" data-demo>Comprar</button></div>
      </div>`,
  },
  taller: {
    subtitulo: 'Estado del coche',
    html: `
      <ul class="lista-estado">
        <li><span>Motor</span><div class="barra"><i style="width:92%"></i></div><b>92%</b></li>
        <li><span>Frenos</span><div class="barra"><i style="width:64%"></i></div><b>64%</b></li>
        <li><span>Suspensión</span><div class="barra aviso"><i style="width:38%"></i></div><b>38%</b></li>
        <li><span>Carrocería</span><div class="barra"><i style="width:81%"></i></div><b>81%</b></li>
      </ul>
      <button class="btn-sec" data-demo>Reparar todo · 300 ◈</button>`,
  },
  gasolinera: {
    subtitulo: 'Repostar',
    html: `
      <div class="deposito"><div class="deposito-nivel" style="height:34%"></div><span>34%</span></div>
      <div class="fila-botones">
        <button class="btn-sec" data-demo>+10 L</button>
        <button class="btn-sec" data-demo>+25 L</button>
        <button class="btn-sec" data-demo>Lleno</button>
      </div>`,
  },
  supabase: {
    subtitulo: 'Prueba de conexión con la base de datos',
    html: `<div class="estado-supa cargando"><span class="spinner"></span><p>Consultando Supabase…</p></div>`,
  },
}

export function crearMenu() {
  const capa = document.getElementById('menu')
  const panel = capa.querySelector('.panel')
  const icono = capa.querySelector('.menu-icono')
  const titulo = capa.querySelector('.menu-titulo')
  const subtitulo = capa.querySelector('.menu-subtitulo')
  const cuerpo = capa.querySelector('.menu-cuerpo')
  const volver = capa.querySelector('.btn-volver')
  const toast = document.getElementById('toast')
  let alCerrar = null
  let abierto = false
  let tToast

  const avisar = (texto) => {
    toast.textContent = texto
    toast.classList.add('visible')
    clearTimeout(tToast)
    tToast = setTimeout(() => toast.classList.remove('visible'), 1800)
  }

  cuerpo.addEventListener('click', (e) => {
    if (e.target.closest('[data-demo]')) avisar('Solo es una demo 🙂')
  })

  const cerrar = () => {
    if (!abierto) return
    abierto = false
    capa.classList.remove('visible')
    setTimeout(() => capa.classList.add('oculto'), 250)
    alCerrar?.()
  }
  volver.addEventListener('click', cerrar)
  window.addEventListener('keydown', (e) => {
    if (abierto && (e.key === 'Escape' || e.key === 'Backspace')) cerrar()
  })

  async function cargarSupabase() {
    const { ok, texto } = await leerSupabase()
    if (!abierto) return
    const [cabecera, ...resto] = texto.split('\n').filter(Boolean)
    const caja = cuerpo.querySelector('.estado-supa')
    if (!caja) return
    caja.className = 'estado-supa ' + (ok ? 'ok' : 'error')
    caja.innerHTML = `
      <p class="supa-cabecera">${ok ? '✔' : '✖'} ${escapar(cabecera)}</p>
      ${resto.length ? `<ul>${resto.map((l) => `<li>${escapar(l.replace(/^•\s*/, ''))}</li>`).join('')}</ul>` : ''}`
  }

  return {
    abrir(punto, onCerrar) {
      alCerrar = onCerrar
      abierto = true
      const c = CONTENIDO[punto.tipo]
      panel.style.setProperty('--acento', punto.color)
      icono.textContent = punto.icono
      titulo.textContent = punto.nombre
      subtitulo.textContent = c.subtitulo
      cuerpo.innerHTML = c.html
      capa.classList.remove('oculto')
      requestAnimationFrame(() => capa.classList.add('visible'))
      volver.focus({ preventScroll: true })
      if (punto.tipo === 'supabase') cargarSupabase()
    },
  }
}

function escapar(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
