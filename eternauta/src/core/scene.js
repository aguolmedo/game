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
 * render(ctx)  dibuja la escena (mundo + su capa uiScene). ctx = { renderer,
 *   camera, uiCamera, lightPost, viewport, game }. Default: defaultRender (mundo
 *   con apagón incluido). Las escenas con dibujado propio lo implementan; main
 *   solo dibuja DESPUÉS la capa de overlay (menús, fundido, cursor).
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

/** Capa de UI de la escena, fija en pantalla (coordenadas de vista). */
export function renderUiLayer(scene, ctx) {
  if (!scene.uiScene) return;
  const { renderer, uiCamera } = ctx;
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(scene.uiScene, uiCamera);
}

/** Dibujado de pantalla fija: cámara de la escena, su mundo y su UI, sin luz. */
export function renderFlat(scene, ctx) {
  scene.applyCamera(ctx.camera);
  ctx.renderer.render(scene.scene, ctx.camera);
  renderUiLayer(scene, ctx);
}

/**
 * Dibujado estándar de una escena de mundo: cámara, mundo (con el shader de
 * luz si hay apagón) y su capa de UI.
 */
export function defaultRender(scene, ctx) {
  const { renderer, camera, lightPost } = ctx;
  scene.applyCamera(camera);
  const apagon = typeof scene.apagonParams === 'function' ? scene.apagonParams() : null;
  if (apagon) lightPost.render(renderer, scene.scene, camera, apagon);
  else renderer.render(scene.scene, camera);
  renderUiLayer(scene, ctx);
}

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
  if (typeof scene.render !== 'function') scene.render = (ctx) => defaultRender(scene, ctx);
  return scene;
}
