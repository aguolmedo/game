CONTEXTO COMÚN (fix 5, mantenibilidad). Proyecto: /home/mateyfasito/dev/game/eternauta. Brief general: docs/brief_fix_5_mantenibilidad.md (leelo). Análisis: docs/analisis_roguelike.md (M7–M11).

REGLA DE ORO: refactor puro. Mismo comportamiento, mismas exportaciones públicas de cada archivo (quien importa de él no se toca), mismos tests. Pasos chicos; `npm test` y `npm run build` después de cada paso.

PROHIBIDO: `git checkout`, `git restore`, `git stash`, `git reset` o cualquier comando git que escriba. NADA está commiteado: un checkout borra días de trabajo. Si necesitás volver atrás un archivo, copialo desde la foto previa: /home/mateyfasito/dev/game/fix5_snapshot/{src,test,tools}/... (misma ruta relativa).

TRABAJO EN PARALELO: otros workers tocan OTROS archivos al mismo tiempo (ver tu lista de archivos permitidos). Tocá SOLO tus archivos. Si falla un test que no tiene que ver con tus archivos, esperá un minuto y volvé a correrlo (puede ser otro worker a mitad de paso); no lo "arregles". No toques bocetos/, art/, public/.

No abras navegador ni capturas: las capturas finales las hace la tanda 2. No levantes vite.
