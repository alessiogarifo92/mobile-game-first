# #190 — Mappa al primo avvio: segnale sul livello aperto

## Problema
Al primo avvio la mappa mostra tanti nodi: chi non ha mai giocato non capisce subito dove toccare. Il nodo corrente pulsa già, ma accanto a nodi bloccati simili il segnale si perde.

## Vincoli
- Solo token di `src/game/theme.ts` (inchiostro, carta, `space`, `type`), nessun asset nuovo.
- Il segnale non deve intercettare i tap: l'hit-test della mappa resta sui nodi.
- `prefers-reduced-motion: reduce` → segnale statico.
- Compare solo finché il giocatore non ha mai aperto un livello (regola pura `needsMapHint` in `src/core/onboarding.ts`); i salvataggi vecchi senza il campo restano compatibili (`seenTips` già esiste, si aggiunge la voce `'map'`).

## Opzione A — anello in espansione attorno al nodo
Un cerchio d'inchiostro che si allarga e svanisce dal nodo aperto.
- Pro: minimo ingombro, coerente con lo stile.
- Contro: il nodo corrente pulsa già, un secondo movimento circolare si somma al primo senza dire *cosa* fare; con movimento ridotto diventa un semplice cerchio, quasi invisibile.

## Opzione B (scelta) — freccia d'inchiostro + etichetta "Tocca per giocare"
Una freccia sopra il nodo che punta in basso, con una pillola di carta bordata d'inchiostro e il testo `map.startHere` (IT "Tocca per giocare", EN "Tap to play"). Oscilla piano su/giù (600 ms, Sine.inOut).
- Pro: esplicita — dice dove e cosa; leggibile anche ferma, quindi con movimento ridotto resta efficace (freccia statica, e il nodo smette di pulsare).
- Contro: occupa spazio sopra il nodo; la pillola è limitata ai bordi della vista per non uscire a 360 px.

**Perché B**: a 360×640 il problema è capire l'azione, non solo trovare il nodo; il testo lo risolve, e la versione statica non perde informazione.

## Quando sparisce
Al primo tap che apre un livello si registra `'map'` in `seenTips`; da lì la mappa non mostra più il segnale, anche se il livello non è stato finito.
