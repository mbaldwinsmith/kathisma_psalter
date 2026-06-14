const NS = 'psalter:';
const mem = {};

function get(key) {
  try {
    const v = localStorage.getItem(NS + key);
    return v === null ? undefined : JSON.parse(v);
  } catch {
    return mem[key];
  }
}

function set(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    mem[key] = value;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    delete mem[key];
  }
}

export { get, set, remove };
