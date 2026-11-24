// Limpieza de entidades de la arena al morir / volver a empezar. Sin three:
// sólo usa los métodos de escena/enemigos que recibe.

/** Saca de la escena TODOS los enemigos (vivos y cadáveres) y vacía la lista. */
export function clearEnemyEntities(parent, enemies) {
  let removed = 0;
  for (const enemy of enemies) {
    const vis = enemy && enemy.vis;
    if (!vis) continue;
    if (vis.mesh) parent.remove(vis.mesh);
    if (vis.shadow) {
      parent.remove(vis.shadow);
      // La geometría de la sombra es compartida (sprite.makeShadow), pero el
      // material es de esta instancia porque cambia su opacidad: sí se libera.
      vis.shadow.material?.dispose?.();
    }
    enemy.vis = null;
    removed += 1;
  }
  enemies.length = 0;
  return removed;
}

/** Saca de la escena los efectos (partículas, fogonazos, etc.). */
export function clearFxEntities(parent, fx) {
  let removed = 0;
  for (const item of fx) {
    if (item && item.mesh) {
      parent.remove(item.mesh);
      removed += 1;
    }
  }
  fx.length = 0;
  return removed;
}

/** Deja la arena limpia: sin enemigos, sin fx y con los sistemas reseteados. */
export function purgeArena(arena) {
  const enemies = clearEnemyEntities(arena.scene, arena.enemies);
  const fx = clearFxEntities(arena.scene, arena.fx);
  arena.shooting?.reset?.();
  arena.footprints?.reset?.();
  arena.snow?.scatter?.();
  return { enemies, fx };
}
