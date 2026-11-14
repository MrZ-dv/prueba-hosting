import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const estado = document.querySelector('#estado')
const filas = document.querySelector('#filas')

function mostrar(texto, clase) {
  estado.textContent = texto
  estado.className = clase
}

async function probar() {
  // 1) ¿Han llegado las variables de entorno al build?
  if (!url || !key) {
    mostrar(
      'Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
        'En local van en .env.local; en Vercel, en Settings > Environment Variables (y luego Redeploy).',
      'error'
    )
    return
  }

  // 2) ¿Responde la base de datos y deja leer con RLS?
  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('prueba_conexion')
    .select('id, mensaje, creado_en')
    .order('id')

  if (error) {
    mostrar('Error al leer de Supabase: ' + error.message, 'error')
    return
  }

  mostrar('Conexión correcta: ' + data.length + ' filas leídas de Supabase.', 'ok')
  for (const fila of data) {
    const li = document.createElement('li')
    li.textContent = fila.mensaje
    filas.appendChild(li)
  }
}

probar()
