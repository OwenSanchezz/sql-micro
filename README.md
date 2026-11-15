# CodeQuet SQL · Paso a Paso

PWA en español para aprender SQL desde cero con siete unidades y 28 micro-lecciones. Usa SQLite en memoria y guarda progreso, XP y racha en el dispositivo. Integra el personaje Quet y la animación de entrada de AppAprendizaje.

## Probar en local

Desde esta carpeta ejecuta `python -m http.server 8000` y abre `http://localhost:8000`. Debe servirse por HTTP; no abras `index.html` como archivo local.

## Publicar en GitHub Pages

1. Crea un repositorio público llamado `sql-micro` en GitHub.
2. Sube el contenido de este proyecto a la rama `main`.
3. En **Settings > Pages**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Cuando termine la publicación, la dirección será `https://USUARIO.github.io/sql-micro/` (sustituye `USUARIO` por tu usuario de GitHub).

Si el repositorio remoto ya existe, sube con: `git push -u origin main`. Si aún no lo has conectado, añade primero el remoto con `git remote add origin https://github.com/USUARIO/sql-micro.git`.

## Instalar en iPhone

Abre el enlace en Safari > **Compartir** > **Añadir a pantalla de inicio**. Abre la app siempre desde el icono nuevo: el progreso de `localStorage` no se comparte entre Safari y el icono.

## Actualizar

Cambia la versión del caché en `sw.js`, sube los cambios, cierra la app por completo y vuelve a abrirla.

## Contenido y licencia

Contenido propio. Inspirado en freeCodeCamp y Duolingo. SQL.js 1.13.0 se sirve localmente desde `vendor/` para que la app pueda funcionar sin conexión después de la primera carga.
