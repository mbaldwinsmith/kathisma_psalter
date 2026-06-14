import * as storage from './storage.js';

const KEY = 'state';
const SCHEMA_VERSION = 1;

const DEFAULTS = {
  version: SCHEMA_VERSION,
  current: { kathisma: 1, stasis: 1 },
  cycle: 1,
  numbering: 'lxx',
  theme: 'auto',
  fontScale: 1.0,
  lastReadISO: null,
  history: [],
  alleluia: true,
};

let _state = null;

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  if (!raw.version) raw.version = SCHEMA_VERSION;
  // Future migrations go here
  return { ...DEFAULTS, ...raw, version: SCHEMA_VERSION };
}

function load() {
  if (_state) return _state;
  _state = migrate(storage.get(KEY));
  return _state;
}

function save() {
  storage.set(KEY, _state);
}

function getState() { return load(); }

function setState(patch) {
  _state = { ...load(), ...patch };
  save();
}

function getCurrent() { return load().current; }

function setCurrent(kathisma, stasis) {
  setState({ current: { kathisma, stasis } });
}

function getCycle() { return load().cycle; }

function incrementCycle() {
  setState({ cycle: load().cycle + 1 });
}

function getNumbering() { return load().numbering; }
function setNumbering(v) { setState({ numbering: v }); }

function getTheme() { return load().theme; }
function setTheme(v) { setState({ theme: v }); }

function getFontScale() { return load().fontScale; }
function setFontScale(v) { setState({ fontScale: v }); }

function getAlleluia() { return load().alleluia ?? true; }
function setAlleluia(v) { setState({ alleluia: v }); }

function recordHistory(kathisma, stasis) {
  const s = load();
  const entry = { kathisma, stasis, atISO: new Date().toISOString() };
  const history = [entry, ...(s.history || [])].slice(0, 100);
  setState({ history, lastReadISO: entry.atISO });
}

function resetProgress() {
  setState({
    current: { kathisma: 1, stasis: 1 },
    cycle: 1,
    history: [],
    lastReadISO: null,
  });
}

export {
  getState, setState,
  getCurrent, setCurrent,
  getCycle, incrementCycle,
  getNumbering, setNumbering,
  getTheme, setTheme,
  getFontScale, setFontScale,
  getAlleluia, setAlleluia,
  recordHistory,
  resetProgress,
};
