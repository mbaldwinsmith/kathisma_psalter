let _structure = null;

async function loadStructure() {
  if (_structure) return _structure;
  const res = await fetch('./data/structure.json');
  _structure = await res.json();
  return _structure;
}

// Build flat stasis index on first use
let _flat = null;
async function flat() {
  if (_flat) return _flat;
  const s = await loadStructure();
  _flat = s.staseis;
  return _flat;
}

function totalStaseis() { return 60; }

async function getStasis(kathisma, stasis) {
  const f = await flat();
  return f.find(s => s.kathisma === kathisma && s.stasis === stasis) || null;
}

async function getByIndex(globalIndex) {
  const f = await flat();
  return f.find(s => s.index === globalIndex) || null;
}

async function next(current) {
  const f = await flat();
  const cur = f.find(s => s.kathisma === current.kathisma && s.stasis === current.stasis);
  if (!cur) return { kathisma: 1, stasis: 1, cycleIncrement: false };
  const idx = cur.index;
  if (idx >= totalStaseis()) {
    return { kathisma: 1, stasis: 1, cycleIncrement: true };
  }
  const n = f.find(s => s.index === idx + 1);
  return { kathisma: n.kathisma, stasis: n.stasis, cycleIncrement: false };
}

async function previous(current) {
  const f = await flat();
  const cur = f.find(s => s.kathisma === current.kathisma && s.stasis === current.stasis);
  if (!cur || cur.index <= 1) return { kathisma: 1, stasis: 1 };
  const p = f.find(s => s.index === cur.index - 1);
  return { kathisma: p.kathisma, stasis: p.stasis };
}

async function getKathismaStaseis(kathisma) {
  const f = await flat();
  return f.filter(s => s.kathisma === kathisma);
}

export { loadStructure, getStasis, getByIndex, next, previous, totalStaseis, getKathismaStaseis };
