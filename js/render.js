import { psalmLabel } from './numbering.js';
import { getNumbering, getAlleluia } from './state.js';

const DOXOLOGY = 'Glory to the Father, and to the Son, and to the Holy Spirit, both now and ever, and unto the ages of ages. Amen.';
const ALLELUIA = 'Alleluia. Alleluia. Alleluia.';

async function loadPsalm(lxxNum) {
  const n = String(lxxNum).padStart(3, '0');
  const res = await fetch(`./data/psalms/lxx/${n}.json`);
  if (!res.ok) throw new Error(`Psalm ${lxxNum} not found`);
  return res.json();
}

function renderVerse(verse) {
  const el = document.createElement('div');
  el.className = 'verse';
  el.setAttribute('id', `v${verse.n}`);

  const num = document.createElement('span');
  num.className = 'verse-number';
  num.setAttribute('aria-hidden', 'true');
  num.textContent = verse.n;

  const text = document.createElement('span');
  text.className = 'verse__text';
  text.textContent = verse.t;

  el.append(num, text);
  return el;
}

function renderPsalmBlock(psalmData, fromVerse, toVerse, numbering) {
  const block = document.createElement('article');
  block.className = 'psalm-block';
  block.setAttribute('aria-label', `Psalm ${psalmData.lxx}`);

  const header = document.createElement('header');
  header.className = 'psalm-header';

  const label = psalmLabel(psalmData.lxx, numbering);

  const numEl = document.createElement('div');
  numEl.className = 'psalm-number';
  numEl.textContent = `Psalm ${label.primary}`;

  header.append(numEl);

  if (label.secondary) {
    const alt = document.createElement('div');
    alt.className = 'psalm-alt-number';
    alt.textContent = label.secondary;
    header.append(alt);
  }

  if (psalmData.title) {
    const title = document.createElement('div');
    title.className = 'psalm-title';
    title.textContent = psalmData.title;
    header.append(title);
  }

  block.append(header);

  const verses = psalmData.verses.filter(v => {
    if (fromVerse && v.n < fromVerse) return false;
    if (toVerse && v.n > toVerse) return false;
    return true;
  });

  const verseList = document.createElement('div');
  verseList.className = 'psalm-verses';
  verseList.setAttribute('role', 'list');

  for (const v of verses) {
    const el = renderVerse(v);
    el.setAttribute('role', 'listitem');
    verseList.append(el);
  }

  block.append(verseList);

  // Indicate partial psalm
  if (toVerse && toVerse < psalmData.verses.at(-1)?.n) {
    const note = document.createElement('p');
    note.className = 'verse--continued-note';
    note.textContent = 'Psalm 118 continues in the next stasis.';
    block.append(note);
  } else if (fromVerse && fromVerse > 1) {
    const note = document.createElement('p');
    note.className = 'verse--continued-note';
    block.insertBefore(note, verseList);
    if (fromVerse === 73) note.textContent = 'Continued from the previous stasis.';
    else if (fromVerse === 132) note.textContent = 'Continued from the previous stasis.';
  }

  return block;
}

async function renderStasis(stasis) {
  const numbering = getNumbering();
  const alleluia = getAlleluia();

  const article = document.createElement('section');
  article.className = 'stasis-article reading-column';
  article.setAttribute('aria-label', `Kathisma ${stasis.kathisma}, Stasis ${stasis.stasis}`);

  for (const psalmRef of stasis.psalms) {
    const psalmData = await loadPsalm(psalmRef.lxx);
    const block = renderPsalmBlock(
      psalmData,
      psalmRef.fromVerse || null,
      psalmRef.toVerse || null,
      numbering
    );
    article.append(block);
  }

  if (stasis.glory) {
    const dox = document.createElement('div');
    dox.className = 'doxology-block';
    const text = document.createElement('p');
    text.className = 'doxology';
    text.textContent = DOXOLOGY;
    dox.append(text);
    if (alleluia) {
      const al = document.createElement('p');
      al.className = 'doxology';
      al.style.marginTop = 'var(--space-sm)';
      al.textContent = ALLELUIA;
      dox.append(al);
    }
    article.append(dox);
  }

  return article;
}

function setTitle(text) {
  document.getElementById('top-bar__title').textContent = text;
}

export { renderStasis, setTitle, loadPsalm };
