import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Lee la tabla prueba_conexion y devuelve { ok, texto } para mostrarlo en el juego.
export async function leerSupabase() {
  // 1) ¿Han llegado las variables de entorno al build?
  if (!url || !key) {
    return {
      ok: false,
      texto:
        'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.\n' +
        'En local van en .env.local; en Vercel, en Settings > Environment Variables (y luego Redeploy).',
    }
  }

  // 2) ¿Responde la base de datos y deja leer con RLS?
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from('prueba_conexion')
      .select('id, mensaje, creado_en')
      .order('id')

    if (error) return { ok: false, texto: 'Error al leer de Supabase: ' + error.message }

    const lineas = data.map((fila) => '• ' + fila.mensaje).join('\n')
    return { ok: true, texto: `Conexión correcta: ${data.length} filas leídas.\n\n${lineas}` }
  } catch (e) {
    return { ok: false, texto: 'Error de red: ' + e.message }
  }
}
