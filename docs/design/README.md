# Design UI/UX — decisione

Canvas con le 3 direzioni (stesse schermate: Gioco, Mappa livelli, Vittoria): [`directions.html`](directions.html) (aprire nel browser).

## Direzione scelta: A — "Gouache Studio"
Scelta delegata a Claude dall'utente (1 ott 2026). Motivo: il tema "pittura" rinforza la meccanica di mixing sottrattivo, si distingue dai cloni flat/candy (direzione C) ed evita l'ambiguità additiva del neon (direzione B); su fondo chiaro i 6 colori restano leggibili nei video brevi.

Unica fonte di verità in codice: `src/game/theme.ts`.

| Token | Valore |
|---|---|
| Sfondo | `#FFF6E9` (carta calda) |
| Tela | `#FFFDF8` · pixel vuoto `#F1E7D8` |
| Nastro | `#D9CBB4` |
| Inchiostro / accento | `#2B2D42` · testo secondario `#66637A` |
| Rosso R | `#E63946` |
| Giallo Y | `#FFB703` |
| Blu B | `#3A86FF` |
| Arancione O (R+Y) | `#FB8500` |
| Verde G (Y+B) | `#43AA8B` |
| Viola P (R+B) | `#8E5BD9` |
| Fango (errore, post-MVP) | `#7A5C45` |
| Oro (premi) | `#FFD166` |
| Skin degli universi 2–5 | coppie colore/accento da token esistenti: `SKIN_COLORS` in `theme.ts` (oro+inchiostro per lo stile dell'universo, 10 varianti per gli stage) |
| Murale | 6 colori di vernice + bianco + inchiostro (`MURAL_PAINT`); tessere vuote in pixel vuoto `#F1E7D8` |
| Tipografia | Titoli: Fredoka 600 · UI: Nunito 700 — MVP usa lo stack `ui-rounded, system-ui` (zero download); Fredoka/Nunito (OFL-1.1) via @fontsource in un ticket successivo |
| Scala tipografica | 12 / 14 / 18 / 24 / 32 px |
| Spaziatura | 4 / 8 / 12 / 16 / 24 px |
| Raggi | 6 px celle-secchielli · 12 px pannelli · pill per i pulsanti |
| Firma | macchia di vernice irregolare a ogni colpo; secchielli a forma di barattolo con munizioni scritte sopra |

## Accessibilità (da tenere fin dall'MVP)
- Ogni primario ha anche un simbolo sul secchiello (R = ●, Y = ▲, B = ■) per i daltonici; i pixel secondari mostrano i due simboli finché non sono completi.
- Target touch ≥ 44 px.
