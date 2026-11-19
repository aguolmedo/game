# game

Juegos pixel-art chicos (bocetos en `bocetos/`: `eternauta/`, `cruce/`). Stack: Three.js + Vite, con joystick (Gamepad API) y teclado como fallback. Reglas del proyecto: `.dsagent.md` (se le antepone automáticamente a cada worker DeepSeek).

## Delegación: DeepSeek primero (ahorrar Claude)

- El trabajo lo hacen los workers DeepSeek, no Claude. Claude solo arma el brief, lanza y revisa el resultado final por encima.
- Tareas grandes: `dsagent lead "<objetivo + criterios de aceptación>"` en background. El lead spawnea `dsagent coder` / `dsagent analyzer` por su cuenta (profundidad máx. 2) y no vuelve hasta cumplir los criterios.
- Tareas chicas: subagentes `deepseek-coder`, `deepseek-analyzer`, `deepseek-general`.
- `coder` (sonnet) y `mech` (haiku) solo si DeepSeek falla repetidamente o el código es sensible.
- Arte: siempre a partir de los sprites/generadores de `bocetos/`; nunca tocar `bocetos/`.
- Verificación: `npm run build`. Nunca abrir el navegador/ventana de forma interactiva.

## Ciclo de vida de los agentes (conducta fija)

1. **Lanzar sin avisar antes** (el usuario no quiere el anuncio). Dos workers en paralelo solo si no tocan los mismos archivos.
2. **Preferir `dsagent` directo** (Bash en background, salida a un log en el scratchpad) a los subagentes `deepseek-*`: el intermediario Haiku corta `dsagent` y sale con código 144 aunque el trabajo se haya hecho, y no devuelve el informe del worker.
3. **Al terminar cada worker (o si sale con error):**
   - Revisar procesos y matar lo que quede: `ps -eo pid,etime,cmd | grep -E "dsagent|claude --bare|vite --port 5199|chrome-linux64/chrome"`. Nunca dejar servidores de Vite ni Chrome headless vivos.
   - Verificar uno mismo: `npm run build`, `npm test` y mirar las capturas. No confiar en "pasó" del worker.
   - Contarle al usuario: qué hizo, qué se verificó, qué falló y qué procesos se mataron.
4. **Si un worker se cuelga** (sin cambios en disco por más de ~20 min) o sale con error: matarlo, revisar qué alcanzó a escribir, y avisar antes de relanzar. No relanzar en silencio.
5. **El aviso "Claude Code doesn't recognize the model deepseek-flash" es inofensivo** (el modelo existe; ver `dsagent check`).
