import { NPC } from '../npc.js';
import { Pickup } from '../pickup.js';
import { playerFootTile, bumpMapVersion } from '../reach.js';
import { supportCheck } from '../placement.js';


export function givePickups(scene) {
  for (const pickup of scene.pickups) pickup.dispose(scene.scene);
  scene.pickups = scene.mapData.pickups.map(
    (def) => new Pickup(scene.scene, scene.game.assets, def),
  );
}

/** Aplica a la escena los muebles movidos que persisten entre mapas (§3). */
export function applyWorldState(scene) {
  const moved = scene.worldState?.moved || {};
  for (const [id, pos] of Object.entries(moved)) {
    const obj = scene.mapData.objects.find((o) => o.id === id);
    if (!obj || !Number.isInteger(pos?.tx) || !Number.isInteger(pos?.ty)) continue;
    obj.x = pos.tx;
    obj.y = pos.ty;
    obj.hidden = false;
    if (obj.mesh) obj.mesh.visible = true;
    obj.solid = true;
    scene.world.updateObject(obj);
  }
  scene.world.rebuildSolids();
  scene.invalidateReach();
  scene.surface.sync();
}

export function invalidateReach(scene) {
  scene.supportCache?.clear();
  scene.supportCacheKey = null;
}

/** SupportCheck con caché por mueble + casillero + casillero de Juan (§6). */
export function checkSupportCached(scene, args) {
  const p = playerFootTile({ x: scene.player.x, feet: scene.player.feet });
  const key = `${args.object?.id}:${args.tx},${args.ty}:${p.tx},${p.ty}`;
  if (scene.supportCache?.has(key)) return scene.supportCache.get(key);
  const result = supportCheck(args);
  if (scene.supportCache) scene.supportCache.set(key, result);
  return result;
}

/** Estados del mundo que dependen de banderas (§3, §6.3). */
export function applyStoryState(scene) {
  const flags = scene.game.flags || {};
  for (const obj of scene.mapData.objects) {
    let hidden = false;
    if (obj.showIfFlag) hidden = !flags[obj.showIfFlag];
    if (obj.hideIfFlag) hidden = hidden || Boolean(flags[obj.hideIfFlag]);
    if (obj.showWhenClosed) hidden = Boolean(flags[`closed_${obj.id}`]);
    obj.hidden = hidden;
    if (obj.mesh) obj.mesh.visible = !hidden;
  }
  bumpMapVersion(scene.mapData);
  const polskyLeft = Boolean(flags.polskyLeft || flags.polsky_muerto);
  const defs = scene.mapData.npcs || [];
  for (const npc of scene.npcs) {
    const def = defs.find((d) => d.id === npc.id) || {};
    // showIfFlag: el NPC solo existe en ese modo (las estaciones de la base).
    const hiddenByFlag = Boolean(def.showIfFlag) && !flags[def.showIfFlag];
    npc.hidden = (scene.name === 'attic' && npc.id === 'polsky' && polskyLeft)
      || Boolean(flags[`npc_gone_${npc.id}`])
      || hiddenByFlag;
    npc.mesh.visible = !npc.hidden;
    npc.shadow.visible = !npc.hidden;
    if (npc.hidden) npc.bubble.mesh.visible = false;
  }
  scene.applyModeVisuals();
  // faroles y ventanas electricas apagadas en el apagon
  for (const light of scene.mapData.lights || []) {
    if (light.kind === 'electric' && flags.apagon) light.state = 'off';
    else if (light.kind === 'electric' && light.onlyIn === 'electrica' && !flags.apagon) {
      light.state = 'on';
    }
  }
  scene.surface.sync();
  scene.invalidateReach();
}

export function applyModeVisuals(scene) {
  const flags = scene.game.flags || {};
  scene.world.setDark(Boolean(flags.apagon));
}

export function setLightState(scene, id, on) {
  const light = (scene.mapData.lights || []).find((l) => l.id === id);
  if (light) light.state = on ? 'on' : 'off';
  if (id === 'bulb') {
    const obj = scene.mapData.objects.find((o) => o.id === 'bulb');
    if (obj && obj.mesh) obj.mesh.visible = Boolean(on);
  }
}
