// Inselleben 13 „Gartenzeit“: Fleißkärtchen mit Sternchen-Laden, Wunschbrunnen. (Zäune und Tore sind reine Deko-Daten
// in data.js, Zugezogene als richtige Nachbarn stecken in extras.js / features/nrooms.js / features/nhomes.js.)
import { plus13, wish13, plusEvent, migratePlus, morningPlus } from './features/plus.js';
import { migrateAreas13 } from './features/areas3.js';
export * from './features/plus.js';
export * from './features/areas3.js';
export { plusEvent };
export function migrate13(s) { migratePlus(s); migrateAreas13(s); }
export function morning13(s) { morningPlus(s); }
export const E13_ACTIONS = { plus13, wish13 };
