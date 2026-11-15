export async function installPad(page) {
  await page.addInitScript(() => {
    const pad = { connected: true, id: 'Fake Pad (STANDARD GAMEPAD)', index: 0, mapping: 'standard', timestamp: 1,
      axes: [0,0,0,0], buttons: Array.from({length:16},()=>({pressed:false,value:0})) };
    window.__pad = pad;
    window.__padSet = (o={}) => {
      if (o.axes) pad.axes = o.axes.slice();
      if (o.buttons) o.buttons.forEach(([i, down, value=down?1:0]) => { pad.buttons[i] = { pressed: !!down, value }; });
      pad.timestamp += 1;
    };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null], configurable: true });
  });
}
export async function padSet(page, o) { await page.evaluate((o)=>window.__padSet(o), o); }
export async function padTap(page, i, ms=140) {
  await padSet(page,{buttons:[[i,true],[i,false]]});
  await page.waitForTimeout(0);
  await padSet(page,{buttons:[[i,true]]});
  await page.waitForTimeout(ms);
  await padSet(page,{buttons:[[i,false]]});
  await page.waitForTimeout(120);
}
export async function stick(page, x, y, ms=200) {
  await padSet(page,{axes:[x,y,0,0]}); await page.waitForTimeout(ms);
}
export async function stickStop(page) { await padSet(page,{axes:[0,0,0,0]}); await page.waitForTimeout(100); }
