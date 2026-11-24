CONTEXTO COMÚN (mejoras de arquitectura, 24/11). Proyecto: /home/mateyfasito/dev/game/eternauta. Auditoría que origina esto: está resumida en tu brief.
- PROHIBIDO cualquier git que escriba (checkout/restore/stash/reset/commit). Nada está commiteado. Para volver atrás un archivo: copialo de /home/mateyfasito/dev/game/snapshot_arq/{src,test,tools}/<misma ruta>.
- Hay OTROS workers en paralelo en otros archivos. Tocá SOLO tus archivos permitidos. Si falla un test ajeno, esperá y reintentá; no lo arregles.
- Comportamiento del juego igual (salvo lo que el brief pide). `npm test` y `npm run build` en verde después de cada paso.
- No abras navegador ni levantes vite. NO toques el vite del usuario en :5173. No toques bocetos/, art/, public/.
- Al final escribí tu docs/arq/<letra>_resultado.md: qué cambió, mapa de archivos, decisiones, lo que no llegaste a hacer.
