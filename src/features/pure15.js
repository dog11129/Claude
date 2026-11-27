// Teil von extras15.js – kleine Helfer ohne Abhängigkeiten, die auch ältere Module brauchen
// (Tagesglück beim Angeln/Keschern/Fleißkärtchen/Lieferdienst/Herzpunkte, Platz im Koi-Teich).

// Tagesglück aus dem Glückskeks: s.luck = { day, k }
export const LUCKS = {
  fish: ['🎣', 'Anglerglück', 'Seltene Fische beißen heute öfter.'],
  bug: ['🦋', 'Kescherglück', 'Seltene Krabbeltiere zeigen sich heute öfter.'],
  stars: ['⭐', 'Sternchenglück', 'Fleißkärtchen und Wunschbrunnen geben heute doppelt Sternchen.'],
  tip: ['📦', 'Trinkgeldglück', 'Beim Lieferdienst gibt es heute doppeltes Trinkgeld.'],
  love: ['💕', 'Herzensglück', 'Herzpunkte zählen heute anderthalbfach.'],
};
export const luckOf = s => (s.luck && s.luck.day === s.day && LUCKS[s.luck.k] ? s.luck.k : null);
export const lucky = (s, k) => luckOf(s) === k;

// Koi-Teich: je zwei Wasser-Kacheln ein Fisch, höchstens zwölf
export const KOI_MAX = 12;
export const waterCount = s => { let n = 0; for (const k in s.terra || {}) if (s.terra[k] === 'w') n++; return n; };
export const koiCap = s => Math.min(KOI_MAX, Math.floor(waterCount(s) / 2));
// Würde der Teich zu klein, wenn diese Wasser-Kachel verschwindet?
export const koiNeedsWater = s => (s.koi?.fish?.length || 0) > Math.min(KOI_MAX, Math.floor((waterCount(s) - 1) / 2));
