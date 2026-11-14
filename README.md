# prueba-hosting

Mini juego en Phaser 3 para comprobar que Vite + Vercel + Supabase funcionan juntos.

Un coche recorre un mapa generado al azar (cambia en cada recarga). En el mapa
hay puntos de colores; al entrar en uno se abre su menú con un botón **← Volver**
(o Esc). El punto **Estado Supabase** lee la tabla `prueba_conexion` y muestra sus filas.

Controles: flechas/WASD para conducir, clic en el suelo para ir hasta ahí,
clic en un punto para ir y entrar.

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
