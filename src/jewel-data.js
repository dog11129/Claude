// Inselleben 15: Schmuck aus der Goldschmiede (Salon in der Bummelgasse) und Kostüme vom Kürbisfest – reine Daten.
// Schmuck: [id, Name, Zutaten, Hauptfarbe, Zweitfarbe]. In der Garderobe (s.wardrobe) liegt er als 'jw_<id>'.
export const JEWELS = {
  neck: [
    ['kristallkette', 'Kristall-Kette', { kristall: 2, eisen: 1 }, '#d8ecff', '#c9ced6'],
    ['amethystkette', 'Amethyst-Kette', { amethyst: 2, eisen: 1 }, '#b98cf0', '#c9ced6'],
    ['herzkette', 'Rubinherz-Kette', { rubin: 1, eisen: 2 }, '#e8334f', '#c9ced6'],
    ['tropfenkette', 'Saphirtropfen-Kette', { saphir: 1, eisen: 2 }, '#3f7fe0', '#c9ced6'],
    ['perlenkette', 'Perlenkette', { perle: 1 }, '#fbf6ee', '#fbf6ee'],
    ['opalkette', 'Opal-Collier', { opal: 1, goldnugget: 1 }, '#bfe9e4', '#f2c84b'],
  ],
  ear: [
    ['kristallstecker', 'Kristall-Stecker', { kristall: 1 }, '#d8ecff', '#d8ecff'],
    ['rubintropfen', 'Rubin-Tropfen', { rubin: 1, eisen: 1 }, '#e8334f', '#c9ced6'],
    ['saphirtropfen', 'Saphir-Tropfen', { saphir: 1, eisen: 1 }, '#3f7fe0', '#c9ced6'],
    ['smaragdstecker', 'Smaragd-Stecker', { smaragd: 1 }, '#3fc27a', '#3fc27a'],
    ['goldringe', 'Goldene Ringe', { goldnugget: 1 }, '#f2c84b', '#f2c84b'],
  ],
  wrist: [
    ['silberreif', 'Silberreif', { eisen: 3 }, '#c9ced6', '#c9ced6'],
    ['amethystband', 'Amethyst-Armband', { amethyst: 1, eisen: 1 }, '#b98cf0', '#c9ced6'],
    ['goldreif', 'Goldreif', { goldnugget: 1 }, '#f2c84b', '#f2c84b'],
    ['partnerband', 'Partner-Armband', { rubin: 1, saphir: 1, eisen: 2 }, '#e8334f', '#3f7fe0'],
  ],
};
export const JEWEL_SLOTS = [['neck', '📿 Ketten'], ['ear', '💎 Ohrringe'], ['wrist', '✨ Armbänder']];
export const jewelKey = id => 'jw_' + id;
export const jewelOf = (slot, id) => (Object.hasOwn(JEWELS, slot) ? JEWELS[slot] : []).find(j => j[0] === id) || null;

// Kostüme: [Hut-id, Name, Preis in Bonbons]
export const COSTUMES = [['fledermausreif', 'Fledermaus-Haarreif', 4], ['geisterhaube', 'Gespenster-Haube', 5], ['kuerbishut', 'Kürbis-Hut', 5], ['hexenhut', 'Hexenhut', 6]];
// Kürbisse schnitzen: [id, Name, Zeichen]
export const FACES = [['froh', 'Fröhlicher Kürbis', '😄'], ['grusel', 'Grusel-Kürbis', '👻'], ['herz', 'Herz-Kürbis', '💛']];
export const carvedId = f => 'schnitzkuerbis_' + f;
