// LXX <-> Masoretic mapping, encoded as contiguous block rules.
// Each rule: [lxxStart, lxxEnd, masStart, masEnd, note?]
// note 'join' = multiple Masoretic -> one LXX; 'split' = one Masoretic -> multiple LXX
const BLOCKS = [
  // LXX 1-8 == Masoretic 1-8
  [1, 8, 1, 8],
  // LXX 9 == Masoretic 9+10 (joined)
  [9, 9, 9, 10, 'join'],
  // LXX 10-112 == Masoretic 11-113 (offset -1)
  [10, 112, 11, 113],
  // LXX 113 == Masoretic 114+115 (joined)
  [113, 113, 114, 115, 'join'],
  // LXX 114 == Masoretic 116:1-9 (split)
  [114, 114, 116, 116, 'split-a'],
  // LXX 115 == Masoretic 116:10-19 (split)
  [115, 115, 116, 116, 'split-b'],
  // LXX 116-145 == Masoretic 117-146 (offset -1)
  [116, 145, 117, 146],
  // LXX 146 == Masoretic 147:1-11 (split)
  [146, 146, 147, 147, 'split-a'],
  // LXX 147 == Masoretic 147:12-20 (split)
  [147, 147, 147, 147, 'split-b'],
  // LXX 148-150 == Masoretic 148-150
  [148, 150, 148, 150],
  // LXX 151 has no Masoretic equivalent
  [151, 151, null, null],
];

function lxxToMasoretic(lxx) {
  for (const [ls, le, ms, me, note] of BLOCKS) {
    if (lxx < ls || lxx > le) continue;
    if (ms === null) return null;
    if (note === 'join') return `${ms}–${me}`;
    if (note === 'split-a') return `${ms} (first part)`;
    if (note === 'split-b') return `${ms} (second part)`;
    // simple offset block
    const offset = lxx - ls;
    const mas = ms + offset;
    return String(mas);
  }
  return null;
}

function masoreticToLxx(mas) {
  const results = [];
  for (const [ls, le, ms, me, note] of BLOCKS) {
    if (ms === null || mas < ms || mas > me) continue;
    if (note === 'join' || note === 'split-a' || note === 'split-b') {
      // collect all LXX numbers for this Masoretic
      for (let l = ls; l <= le; l++) results.push(l);
    } else {
      const offset = mas - ms;
      results.push(ls + offset);
    }
  }
  if (results.length === 0) return null;
  if (results.length === 1) return String(results[0]);
  return results.join('–');
}

// Returns a display label pair: { primary, secondary }
// primarySystem: 'lxx' | 'masoretic'
function psalmLabel(lxxNum, primarySystem) {
  const mas = lxxToMasoretic(lxxNum);
  const differs = mas !== String(lxxNum);
  if (primarySystem === 'lxx') {
    return {
      primary: String(lxxNum),
      secondary: (mas && differs) ? `Masoretic ${mas}` : null,
    };
  }
  return {
    primary: mas ? `${mas}` : String(lxxNum),
    secondary: differs ? `LXX ${lxxNum}` : null,
  };
}

export { lxxToMasoretic, masoreticToLxx, psalmLabel };
