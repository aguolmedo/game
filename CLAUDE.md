# game

Juegos pixel-art chicos (bocetos en `bocetos/`: `eternauta/`, `cruce/`). Stack: Three.js + Vite, con joystick (Gamepad API) y teclado como fallback. Reglas del proyecto: `.dsagent.md` (se le antepone automáticamente a cada worker DeepSeek).

## Delegación: DeepSeek primero (ahorrar Claude)

- El trabajo lo hacen los workers DeepSeek, no Claude. Claude solo arma el brief, lanza y revisa el resultado final por encima.
- Tareas grandes: `dsagent lead "<objetivo + criterios de aceptación>"` en background. El lead spawnea `dsagent coder` / `dsagent analyzer` por su cuenta (profundidad máx. 2) y no vuelve hasta cumplir los criterios.
- Tareas chicas: subagentes `deepseek-coder`, `deepseek-analyzer`, `deepseek-general`.
- `coder` (sonnet) y `mech` (haiku) solo si DeepSeek falla repetidamente o el código es sensible.
- Arte: siempre a partir de los sprites/generadores de `bocetos/`; nunca tocar `bocetos/`.
- Verificación: `npm run build`. Nunca abrir el navegador/ventana de forma interactiva.
