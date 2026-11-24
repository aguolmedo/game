/**
 * Contrato de escena. Todas las escenas del router lo cumplen: el router y los
 * mediadores llaman estos métodos sin preguntar `?.`.
 *
 * Obligatorios (con no-op por defecto, ver ensureSceneContract):
 *   enter(spawn)       la escena pasa a ser la activa
 *   leave()            la escena deja de ser la activa (antes de enter de la próxima)
 *   update(dt, input)  un paso fijo de lógica (1/60 s)
 *   reset()            partida nueva: volver al estado inicial
 *   dispose()          liberar recursos (hoy las escenas viven toda la sesión)
 *
 * Opcional sin default: render(ctx). Si existe, reemplaza el dibujado estándar
 * (applyCamera + scene/uiScene). ctx = { renderer, camera, uiCamera, lightPost }.
 *
 * Capacidades (declaradas aquí, no se sondean por pato en otro lado):
 *   freezePlayer(bool)       congela/descongela al jugador (menús, cofres, traje)
 *   hideHud() / showHud()    oculta/muestra el HUD de la escena
 *   hideCursor()             oculta el cursor de mundo (menús abiertos)
 *   setLightState(id, on)    enciende/apaga una luz de la escena
 *   applyStoryState()        reaplica el estado de la historia (apagón, etc.)
 *   autoPlaceCarry()         apoya el mueble cargado antes de irse
 *
 * Propiedades: pausable, blocksPause, worldZoom, scene (three), uiScene.
 */
const noop = () => {};

/** Defaults de cada capacidad; usan los campos `player`/`hud`/`cursor` si la escena los tiene. */
export const SCENE_DEFAULTS = {
  enter: noop,
  leave: noop,
  update: noop,
  reset: noop,
  dispose: noop,
  setLightState: noop,
  applyStoryState: noop,
  autoPlaceCarry: noop,
  freezePlayer(on) { if (this.player) this.player.setFrozen(on); },
  hideHud() { if (this.hud) this.hud.hide(); },
  showHud() { if (this.hud) this.hud.show(); },
  hideCursor() { if (this.cursor && this.cursor.hide) this.cursor.hide(); },
};

/** Rellena con no-ops lo que falte, sin pisar lo que la escena ya define. */
export function ensureSceneContract(scene) {
  for (const [name, fn] of Object.entries(SCENE_DEFAULTS)) {
    if (typeof scene[name] !== 'function') scene[name] = fn;
  }
  return scene;
}
