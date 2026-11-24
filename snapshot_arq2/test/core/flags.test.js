// Registro de banderas (src/data/flags.js): unicidad, uso estático en src y
// guardFlags avisando de una clave desconocida.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FLAG,
  CLOSABLE_IDS,
  NPC_GONE_PREFIX,
  closedFlag,
  npcGoneFlag,
  isKnownFlag,
  guardFlags,
} from '../../src/data/flags.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function srcFiles(dir = path.join(ROOT, 'src')) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Tapa strings, templates y comentarios dejando el mismo largo y los saltos. */
function maskNonCode(code) {
  let out = '';
  let mode = 'code';
  for (let i = 0; i < code.length; i += 1) {
    const c = code[i];
    const next = code[i + 1];
    if (mode === 'code') {
      if (c === '/' && next === '/') { mode = 'line'; out += '  '; i += 1; }
      else if (c === '/' && next === '*') { mode = 'block'; out += '  '; i += 1; }
      else if (c === "'" || c === '"' || c === '`') { mode = c; out += ' '; }
      else out += c;
    } else if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += '\n'; } else out += ' ';
    } else if (mode === 'block') {
      if (c === '*' && next === '/') { mode = 'code'; out += '  '; i += 1; }
      else out += c === '\n' ? '\n' : ' ';
    } else {
      // string o template
      if (c === '\\') { out += '  '; i += 1; }
      else if (c === mode) { mode = 'code'; out += ' '; }
      else out += c === '\n' ? '\n' : ' ';
    }
  }
  return out;
}

const lineAt = (code, index) => code.slice(0, index).split('\n').length;

/** Referencias estáticas a banderas: `flags.clave`, `flags?.clave`, `flags['clave']`. */
function staticFlagRefs(code) {
  const refs = [];
  const masked = maskNonCode(code);
  for (const m of masked.matchAll(/\bflags\s*\?\.\s*([A-Za-z_$][\w$]*)/g)) {
    refs.push({ key: m[1], line: lineAt(masked, m.index) });
  }
  for (const m of masked.matchAll(/\bflags\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
    refs.push({ key: m[1], line: lineAt(masked, m.index) });
  }
  for (const m of code.matchAll(/\bflags\s*\??\s*(?:\.\s*)?\[\s*['"]([^'"]+)['"]\s*\]/g)) {
    refs.push({ key: m[1], line: lineAt(code, m.index) });
  }
  return refs;
}

test('FLAG: todas las claves son únicas y con nombre en mayúsculas', () => {
  const entries = Object.entries(FLAG);
  const values = entries.map(([, value]) => value);
  assert.equal(new Set(values).size, values.length, 'hay valores repetidos en FLAG');
  for (const [name, value] of entries) {
    assert.match(name, /^[A-Z][A-Z0-9_]*$/, `nombre raro: ${name}`);
    assert.equal(typeof value, 'string');
    assert.ok(value.length > 0);
    assert.ok(isKnownFlag(value), `${name} no pasa isKnownFlag`);
  }
});

test('src/**: toda bandera estática usada en el código está declarada en FLAG', () => {
  const unknown = [];
  for (const file of srcFiles()) {
    const code = fs.readFileSync(file, 'utf8');
    for (const ref of staticFlagRefs(code)) {
      if (isKnownFlag(ref.key)) continue;
      const rel = path.relative(ROOT, file);
      unknown.push(`${rel}:${ref.line} usa "${ref.key}"`);
    }
  }
  assert.deepEqual(unknown, [], `banderas sin declarar:\n${unknown.join('\n')}`);
});

test('src/**: cada constante FLAG.<X> referenciada existe (typo de constante)', () => {
  const missing = [];
  for (const file of srcFiles()) {
    const code = maskNonCode(fs.readFileSync(file, 'utf8'));
    for (const m of code.matchAll(/\bFLAG\.([A-Za-z_$][\w$]*)/g)) {
      if (m[1] in FLAG) continue;
      missing.push(`${path.relative(ROOT, file)}:${lineAt(code, m.index)} FLAG.${m[1]}`);
    }
  }
  assert.deepEqual(missing, [], `constantes inexistentes:\n${missing.join('\n')}`);
});

test('src/**: los literales de datos (toggle/showIfFlag/hideIfFlag/needsFlag) están declarados', () => {
  const unknown = [];
  for (const file of srcFiles()) {
    const code = fs.readFileSync(file, 'utf8');
    const re = /\b(?:toggle|showIfFlag|hideIfFlag|needsFlag|devFlag|flag)\s*:\s*['"]([^'"]+)['"]/g;
    for (const m of code.matchAll(re)) {
      if (isKnownFlag(m[1])) continue;
      unknown.push(`${path.relative(ROOT, file)}:${lineAt(code, m.index)} "${m[1]}"`);
    }
  }
  assert.deepEqual(unknown, [], `literales sin declarar:\n${unknown.join('\n')}`);
});

test('guardFlags: avisa con clave desconocida y no con las declaradas', () => {
  const warns = [];
  const original = console.warn;
  console.warn = (...args) => warns.push(args.join(' '));
  try {
    const flags = guardFlags({});
    flags[FLAG.APAGON] = true;                   // escritura conocida
    assert.equal(flags[FLAG.APAGON], true);      // lectura conocida
    assert.equal('closed_window_martita' in flags, false); // familia closed_<id>
    delete flags[FLAG.APAGON];                   // borrado conocido
    assert.equal(warns.length, 0, `avisó de más: ${warns.join(' | ')}`);

    flags.apagno = true;                         // typo: escritura
    void flags.otraCosa;                         // lectura
    delete flags.otraCosa2;                      // borrado
  } finally {
    console.warn = original;
  }
  assert.equal(warns.length, 3);
  for (const w of warns) assert.match(w, /bandera desconocida/);
});

test('guardFlags: devuelve el mismo objeto si no es objeto', () => {
  assert.equal(guardFlags(null), null);
  assert.equal(guardFlags(undefined), undefined);
  assert.equal(guardFlags('x'), 'x');
});

test('familias dinámicas closed_<id> y npc_gone_<id>', () => {
  for (const id of CLOSABLE_IDS) assert.ok(isKnownFlag(closedFlag(id)), id);
  assert.equal(closedFlag('window_martita'), 'closed_window_martita');
  assert.equal(isKnownFlag(closedFlag('ventana_trucha')), false);
  assert.ok(isKnownFlag(npcGoneFlag('elena')));
  assert.equal(npcGoneFlag('elena'), 'npc_gone_elena');
  assert.equal(isKnownFlag(NPC_GONE_PREFIX), false);
  assert.equal(isKnownFlag('apagno'), false);
  assert.equal(isKnownFlag(''), false);
  assert.equal(isKnownFlag(null), false);
  assert.equal(isKnownFlag(42), false);
});
