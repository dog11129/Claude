// Salon „Schnipp & Glanz“ (Bummelgasse): was es nur beim Friseur und im Nagelstudio gibt. Reine Daten – für die Figur
// (avatar.js), den Aussehen-Editor (menu.js) und die Spiellogik (features/trade14.js).
export const SALON = {
  hair: [['hochsteck', 'Hochsteckfrisur'], ['seitenzopf', 'Seitenzopf'], ['pixie', 'Pixie'], ['maehne', 'Lockenmähne'], ['flechtkrone', 'Flechtkrone'], ['spacebuns', 'Space Buns']],
  hcol: [['#ff7ab8', 'Bonbonrosa'], ['#7ad0d9', 'Türkis'], ['#ece8f7', 'Platin'], ['#ffd9e8', 'Rosé-Blond'], ['#8a5bd6', 'Violett'], ['#ff9a6b', 'Pfirsich-Kupfer']],
  nails: [['rosa', 'Rosa', '#ff9ab8'], ['rot', 'Kirschrot', '#e23a4a'], ['koralle', 'Koralle', '#ff7a66'], ['flieder', 'Flieder', '#b39cff'], ['mint', 'Mint', '#8fe0c0'], ['himmel', 'Himmelblau', '#7cc4ff'],
    ['gold', 'Gold-Glitzer', '#f2c84a'], ['french', 'French', '#fff5f0'], ['schwarz', 'Schwarz', '#3b3b40']],
};
export const SALON_PRICE = { hair: 600, hcol: 300, nails: 150 };
export const SALON_NAME = { hair: 'Frisur', hcol: 'Haarfarbe', nails: 'Nagellack' };
// Unter diesem Namen liegt das Gekaufte in der Garderobe (s.wardrobe)
export const salonKey = (kind, id) => (kind === 'hair' ? id : kind === 'hcol' ? 'hc_' + id.slice(1) : 'nl_' + id);
export const SALON_HAIR = SALON.hair.map(h => h[0]), SALON_HCOL = SALON.hcol.map(h => h[0]), SALON_NAILS = SALON.nails.map(h => h[0]);
export const NAIL_COL = Object.fromEntries(SALON.nails.map(n => [n[0], n[2]]));
