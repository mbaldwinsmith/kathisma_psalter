const routes = {};

function on(pattern, handler) {
  routes[pattern] = handler;
}

function parse(hash) {
  const path = hash.replace(/^#/, '') || '/';
  // Try exact match first
  if (routes[path]) return { handler: routes[path], params: {} };
  // Try parameterised patterns
  for (const [pattern, handler] of Object.entries(routes)) {
    const keys = [];
    const re = new RegExp(
      '^' + pattern.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'
    );
    const m = path.match(re);
    if (m) {
      const params = {};
      keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handler, params };
    }
  }
  return null;
}

function navigate(path) {
  location.hash = path;
}

function start() {
  function dispatch() {
    const hash = location.hash || '#/';
    const match = parse(hash);
    if (match) {
      match.handler(match.params);
    } else {
      navigate('/');
    }
  }
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

export { on, navigate, start };
