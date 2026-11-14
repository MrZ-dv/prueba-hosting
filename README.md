# prueba-hosting

**Ruta Libre**: juego 3D en Three.js para comprobar que Vite + Vercel + Supabase
funcionan juntos con un front parecido al de un producto final.

Un coche recorre un terreno con montañas, lagos y bosques generado al azar
(cambia en cada recarga). Hay cinco puntos de interés con un círculo de luz;
al entrar en uno se abre su menú con un botón **← Volver** (o Esc). El punto
**Estado Supabase** lee la tabla `prueba_conexion` y muestra sus filas.

Controles: flechas o WASD.

Todo (coche, árboles, edificios y texturas) se genera por código: no hay
assets que descargar.

| Carpeta | Contenido |
|---|---|
| `src/mundo/` | terreno, texturas, cielo y luz, vegetación, puntos de interés |
| `src/coche.js` | modelo y física del coche |
| `src/camara.js` | cámara en tercera persona |
| `src/ui/` | HUD (velocímetro, minimapa, destino) y menús |
| `src/supabase.js` | lectura de prueba de Supabase |

Añadiendo `?debug` a la URL se expone `window.__juego` para pruebas automáticas.

## En local

```bash
npm install
npm run dev
```

Las variables están en `.env.local` (no se sube a GitHub).

## En Vercel

1. Sube esta carpeta a un repo público de GitHub.
2. En vercel.com: Add New > Project > importa el repo (detecta Vite solo).
3. Antes de pulsar Deploy, añade en Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Si añades las variables después, hay que hacer Redeploy:
   Vite las incrusta en el build, no las lee en tiempo de ejecución.

## Keep-alive

`.github/workflows/keepalive.yml` hace una lectura a Supabase dos veces por
semana para que el plan gratuito no pause el proyecto. Se puede lanzar a mano
desde la pestaña Actions del repo.
