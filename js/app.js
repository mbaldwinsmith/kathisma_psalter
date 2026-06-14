import * as router from './router.js';
import * as state from './state.js';
import * as plan from './plan.js';
import * as render from './render.js';
import { next, previous, getStasis, getKathismaStaseis, loadStructure } from './plan.js';
import { psalmLabel } from './numbering.js';

// Apply theme on boot before first paint
applyTheme(state.getTheme());
applyFontScale(state.getFontScale());

function applyTheme(theme) {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function applyFontScale(scale) {
  document.documentElement.style.setProperty('--font-scale', scale);
  document.documentElement.style.fontSize = `${scale * 100}%`;
}

// Service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });
  });
}

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--accent);color:var(--bg);padding:var(--space-sm) var(--space-md);text-align:center;font-size:var(--text-sm);z-index:999;';
  banner.textContent = 'A new version is available. ';
  const btn = document.createElement('button');
  btn.textContent = 'Refresh to update';
  btn.style.cssText = 'margin-left:var(--space-sm);text-decoration:underline;font:inherit;color:inherit;cursor:pointer;background:none;border:none;';
  btn.onclick = () => location.reload();
  banner.append(btn);
  document.body.append(banner);
}

// Install prompt
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { _installPrompt = e; });

// Auto-hide top bar and reader bar on scroll
let _lastScrollY = 0;
window.addEventListener('scroll', () => {
  const top = document.getElementById('top-bar');
  const bar = document.getElementById('reader-bar');
  const dy = window.scrollY - _lastScrollY;
  _lastScrollY = window.scrollY;
  if (dy > 10) {
    top.classList.add('top-bar--hidden');
    if (bar) bar.classList.add('reader-bar--hidden');
  } else if (dy < -10 || window.scrollY < 60) {
    top.classList.remove('top-bar--hidden');
    if (bar) bar.classList.remove('reader-bar--hidden');
  }
}, { passive: true });

// Keyboard navigation in reader
window.addEventListener('keydown', e => {
  if (location.hash.startsWith('#/read/')) {
    if (e.key === 'ArrowRight') document.getElementById('btn-next')?.click();
    if (e.key === 'ArrowLeft')  document.getElementById('btn-prev')?.click();
  }
});

// Routing
router.on('/', showHome);
router.on('/read/:kathisma/:stasis', showReader);
router.on('/plan', showPlan);
router.on('/settings', showSettings);

async function transition(fn) {
  const main = document.getElementById('main');
  main.classList.add('transitioning');
  await new Promise(r => setTimeout(r, 200));
  main.classList.remove('transitioning');
  await fn();
}

async function showHome() {
  render.setTitle('Kathisma Psalter');
  document.getElementById('reader-bar').hidden = true;
  await transition(async () => {
    const s = state.getCurrent();
    const cycle = state.getCycle();
    const stasisData = await getStasis(s.kathisma, s.stasis);
    const main = document.getElementById('main');
    main.innerHTML = '';

    const home = document.createElement('div');
    home.className = 'home';

    // Build psalm range label
    const numbering = state.getNumbering();
    const psalmRange = stasisData
      ? stasisData.psalms.map(p => {
          const lbl = psalmLabel(p.lxx, numbering);
          return lbl.primary;
        }).join(', ')
      : '';

    home.innerHTML = `
      <div class="continue-card">
        <div class="continue-card__label">Continue reading</div>
        <div class="continue-card__heading">Kathisma ${s.kathisma}, Stasis ${s.stasis}</div>
        <div class="continue-card__sub">Psalms ${psalmRange}</div>
        <div class="continue-card__progress">Stasis ${stasisData?.index ?? '?'} of 60 &middot; Cycle ${cycle}</div>
        <a class="btn-primary" href="#/read/${s.kathisma}/${s.stasis}">Open</a>
      </div>
      <a href="#/plan" style="color:var(--accent);font-size:var(--text-sm);">View full reading plan</a>
    `;

    main.append(home);
  });
}

async function showReader({ kathisma, stasis }) {
  const k = parseInt(kathisma, 10);
  const st = parseInt(stasis, 10);
  const stasisData = await getStasis(k, st);
  if (!stasisData) { router.navigate('/'); return; }

  render.setTitle(`Kathisma ${k} · Stasis ${st}`);
  document.getElementById('reader-bar').hidden = false;

  // Dots
  const kathismaStaseis = await getKathismaStaseis(k);
  const dots = document.getElementById('stasis-dots');
  dots.innerHTML = '';
  for (const s of kathismaStaseis) {
    const dot = document.createElement('span');
    dot.className = 'stasis-dot' +
      (s.stasis === st ? ' stasis-dot--active' : '');
    dot.setAttribute('role', 'listitem');
    dot.setAttribute('aria-label', `Stasis ${s.stasis} of 3${s.stasis === st ? ', current' : ''}`);
    dots.append(dot);
  }

  // Prev / Next
  document.getElementById('btn-prev').onclick = async () => {
    const p = await previous({ kathisma: k, stasis: st });
    router.navigate(`/read/${p.kathisma}/${p.stasis}`);
  };
  document.getElementById('btn-next').onclick = async () => {
    const n = await next({ kathisma: k, stasis: st });
    router.navigate(`/read/${n.kathisma}/${n.stasis}`);
  };
  document.getElementById('btn-complete').onclick = async () => {
    state.recordHistory(k, st);
    const n = await next({ kathisma: k, stasis: st });
    if (n.cycleIncrement) state.incrementCycle();
    state.setCurrent(n.kathisma, n.stasis);
    router.navigate(`/read/${n.kathisma}/${n.stasis}`);
  };

  await transition(async () => {
    const main = document.getElementById('main');
    main.innerHTML = '';
    window.scrollTo(0, 0);
    const article = await render.renderStasis(stasisData);
    main.append(article);
  });
}

async function showPlan() {
  render.setTitle('Reading Plan');
  document.getElementById('reader-bar').hidden = true;
  await transition(async () => {
    const structure = await loadStructure();
    const main = document.getElementById('main');
    main.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'plan';

    // Group staseis by kathisma
    const byKathisma = {};
    for (const s of structure.staseis) {
      (byKathisma[s.kathisma] = byKathisma[s.kathisma] || []).push(s);
    }

    const numbering = state.getNumbering();

    for (let k = 1; k <= 20; k++) {
      const staseis = byKathisma[k] || [];
      const row = document.createElement('div');
      row.className = 'kathisma-row';

      const hdr = document.createElement('button');
      hdr.className = 'kathisma-row__header';
      hdr.innerHTML = `<strong>Kathisma ${k}</strong>`;
      hdr.setAttribute('aria-expanded', 'false');

      const body = document.createElement('div');
      body.className = 'kathisma-row__staseis';

      for (const s of staseis) {
        const range = s.psalms.map(p => {
          const lbl = psalmLabel(p.lxx, numbering);
          return lbl.primary;
        }).join(', ');
        const item = document.createElement('button');
        item.className = 'stasis-item';
        item.innerHTML = `<span>Stasis ${s.stasis}</span><span style="flex:1;color:var(--ink-muted);font-size:var(--text-sm);">Psalms ${range}</span>`;
        item.onclick = () => router.navigate(`/read/${k}/${s.stasis}`);
        body.append(item);
      }

      hdr.onclick = () => {
        const open = body.classList.toggle('kathisma-row__staseis--open');
        hdr.setAttribute('aria-expanded', String(open));
      };

      row.append(hdr, body);
      container.append(row);
    }

    main.append(container);
  });
}

async function showSettings() {
  render.setTitle('Settings');
  document.getElementById('reader-bar').hidden = true;
  await transition(async () => {
    const main = document.getElementById('main');
    main.innerHTML = '';

    const settings = document.createElement('div');
    settings.className = 'settings';

    // Numbering
    const numGroup = document.createElement('div');
    numGroup.className = 'setting-group';
    numGroup.innerHTML = `<div class="setting-group__label">Psalm numbering</div>`;
    const numRow = document.createElement('div');
    numRow.className = 'setting-row';
    const numLabel = document.createElement('span');
    numLabel.textContent = 'Primary numbering';
    const numSelect = document.createElement('select');
    numSelect.innerHTML = `<option value="lxx">Septuagint (LXX)</option><option value="masoretic">Masoretic (Hebrew)</option>`;
    numSelect.value = state.getNumbering();
    numSelect.onchange = () => state.setNumbering(numSelect.value);
    numRow.append(numLabel, numSelect);
    numGroup.append(numRow);

    // Theme
    const themeGroup = document.createElement('div');
    themeGroup.className = 'setting-group';
    themeGroup.innerHTML = `<div class="setting-group__label">Theme</div>`;
    const themeRow = document.createElement('div');
    themeRow.className = 'setting-row';
    const themeLabel = document.createElement('span');
    themeLabel.textContent = 'Colour theme';
    const themeSelect = document.createElement('select');
    themeSelect.innerHTML = `<option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option>`;
    themeSelect.value = state.getTheme();
    themeSelect.onchange = () => { state.setTheme(themeSelect.value); applyTheme(themeSelect.value); };
    themeRow.append(themeLabel, themeSelect);
    themeGroup.append(themeRow);

    // Font size
    const fontGroup = document.createElement('div');
    fontGroup.className = 'setting-group';
    fontGroup.innerHTML = `<div class="setting-group__label">Text size</div>`;
    const fontRow = document.createElement('div');
    fontRow.className = 'setting-row';
    const fontLabel = document.createElement('label');
    fontLabel.htmlFor = 'font-scale';
    fontLabel.textContent = 'Size';
    const fontRange = document.createElement('input');
    fontRange.type = 'range';
    fontRange.id = 'font-scale';
    fontRange.min = '0.8';
    fontRange.max = '1.4';
    fontRange.step = '0.05';
    fontRange.value = state.getFontScale();
    fontRange.oninput = () => { state.setFontScale(parseFloat(fontRange.value)); applyFontScale(parseFloat(fontRange.value)); };
    fontRow.append(fontLabel, fontRange);
    fontGroup.append(fontRow);

    // Alleluia
    const alGroup = document.createElement('div');
    alGroup.className = 'setting-group';
    alGroup.innerHTML = `<div class="setting-group__label">Doxology</div>`;
    const alRow = document.createElement('div');
    alRow.className = 'setting-row';
    const alLabel = document.createElement('label');
    alLabel.htmlFor = 'alleluia-toggle';
    alLabel.textContent = 'Show Alleluia after doxology';
    const alCheck = document.createElement('input');
    alCheck.type = 'checkbox';
    alCheck.id = 'alleluia-toggle';
    alCheck.checked = state.getAlleluia();
    alCheck.onchange = () => state.setAlleluia(alCheck.checked);
    alRow.append(alLabel, alCheck);
    alGroup.append(alRow);

    // Install
    if (_installPrompt) {
      const installGroup = document.createElement('div');
      installGroup.className = 'setting-group';
      installGroup.innerHTML = `<div class="setting-group__label">Install</div>`;
      const installBtn = document.createElement('button');
      installBtn.className = 'btn-primary';
      installBtn.textContent = 'Add to home screen';
      installBtn.onclick = () => { _installPrompt.prompt(); _installPrompt = null; installBtn.remove(); };
      installGroup.append(installBtn);
      settings.append(installGroup);
    }

    // Reset
    const resetGroup = document.createElement('div');
    resetGroup.className = 'setting-group';
    resetGroup.innerHTML = `<div class="setting-group__label">Progress</div>`;
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-danger';
    resetBtn.textContent = 'Reset reading plan';
    let confirmed = false;
    resetBtn.onclick = () => {
      if (!confirmed) {
        confirmed = true;
        resetBtn.textContent = 'Tap again to confirm reset';
        setTimeout(() => { confirmed = false; resetBtn.textContent = 'Reset reading plan'; }, 3000);
      } else {
        state.resetProgress();
        router.navigate('/');
      }
    };
    resetGroup.append(resetBtn);

    settings.append(numGroup, themeGroup, fontGroup, alGroup, resetGroup);
    main.append(settings);
  });
}

router.start();
