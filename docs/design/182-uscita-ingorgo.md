# #182 N2 — Dire come uscire dall'ingorgo che il "!" annuncia

**Problema** (playtest T16/T17, `docs/reports/2026-11-05-playtest-feedback-176.md`, N2). La pillola "↩N!" avvisa che
quel lancio prenderà l'ultimo slot libero, o che non ne troverà nessuno. Non dice però cosa fare. P16 non usa mai
"+1 slot" e ha abbandonato S09 al livello 83, dopo tre ingorghi di fila. Due sessioni su quattro lo scrivono:
"l'avviso '!' non mi dava una via d'uscita".

**Vincoli.** Testi in `src/core/i18n.ts`, in IT e EN. Colori e misure da `src/game/theme.ts`. La logica che decide il
rimedio sta in `src/core`, pura e testata. Niente asset nuovi. Lo schermo deve funzionare a 360×640, dove sopra e sotto
la fila degli slot non c'è una riga libera: il nastro finisce a y 750 e la scritta "ATTESA" sta a 770 (`computeLayout`).

**I rimedi possibili**, dal più al meno utile, li calcola `jamEscape` (`src/core/leftover.ts`) con la stessa previsione
delle pillole:
1. **`empty`**: c'è un secchiello lanciabile che non tornerebbe (cioè senza "↩"). Va lanciato per primo. Se è in attesa,
   rilanciarlo libera anche il suo slot.
2. **`extraSlot`**: nessun lancio è sicuro, ma il pannello di ingorgo offrirà ancora "+1 slot" (una volta per tentativo).
3. **`order`**: nessun lancio è sicuro e "+1 slot" è già stato usato. Resta solo cambiare l'ordine dei lanci.

Le tre opzioni qui sotto mostrano questo rimedio in posti e momenti diversi. Il confronto visivo è in
`docs/design/182-uscita-ingorgo-opzioni.png`.

## Opzione A — una frase in più nella scheda "Perché è tornato"
È la proposta del report. In fondo al testo della scheda (`tip.leftover.body`) si aggiunge: "Per evitarlo, lancia prima
un secchiello senza ↩: in attesa, libera il suo slot."
- **Pro**: nessuna UI nuova, si fa in una riga di i18n.
- **Contro**: la scheda compare una volta sola, prima del problema. Il rimedio è generico e non dice quale secchiello
  lanciare. P16 l'ha vista e ha abbandonato lo stesso: chi legge una volta e poi gioca non se lo ricorda tre livelli dopo.

## Opzione B — la via d'uscita, dal vivo, sotto il titolo (scelta)
Finché un "!" è visibile, la riga sotto il titolo, dove sta già la guida del livello 1, mostra il rimedio di quel
momento:
- "Lancia prima un secchiello senza ↩"
- "Rilancia prima quello in attesa senza ↩"
- «Rischio ingorgo: se succede, usa "+1 slot"» (prima del playtest T19 era «Nessun lancio sicuro: in ingorgo, "+1 slot"», letto come un bottone da cercare subito)
- "Nessun lancio sicuro: cambia l'ordine"

Nel caso `empty`, un anello oro (`THEME.gold`, bordo `THEME.ink`) evidenzia anche il secchiello da lanciare. Quando
il "!" sparisce, la riga torna a mostrare il nome del livello.
- **Pro**: arriva nel momento in cui serve e indica il secchiello preciso. Insegna la regola giocando, senza un muro
  di testo, come vuole `docs/strategia-progetto.md`. La riga del sottotitolo è libera anche a 360×640.
- **Contro**: il titolo è lontano dal pollice, quindi l'anello sul secchiello è il segnale principale e la riga lo
  spiega. Come le pillole, la previsione è esatta solo a nastro fermo: con altri secchielli in giro è una stima.

## Opzione C — il consiglio nel pannello "Ingorgo!"
Sotto "Tutti gli slot d'attesa sono pieni." si aggiunge: "La prossima volta: prima i secchielli senza ↩."
- **Pro**: il pannello è già aperto e il giocatore è attento.
- **Contro**: arriva dopo il danno. P16 ha fatto tre ingorghi di fila: il consiglio sarebbe arrivato tre volte, sempre
  troppo tardi. Inoltre il pannello ha già due messaggi ("+1 slot" una volta per tentativo).

## Decisione
**B**. È l'unica opzione che risponde alla frase del playtest ("non mi dava una via d'uscita") nel momento in cui
il "!" compare. A e C restano complementi a basso costo, da valutare dopo il nuovo playtest P09/P16. Non sono in
questo ticket, perché aggiungerebbero testo a schede che il report già giudica dense.

## Implementazione
- Core: `jamEscape(state)`, `escapeKey(e)` in `src/core/leftover.ts`, testati in `tests/leftover.test.ts`.
- Scena: `PlayScene.drawEscape`, chiamata a ogni frame dopo le pillole. Il calcolo è in cache per tick. Il sottotitolo
  di prima viene salvato e rimesso al suo posto. Durante la guida del livello 1 la riga non viene toccata.
- Testi: `escape.*` in `src/core/i18n.ts`, al massimo 44 caratteri, così stanno su una riga (verificato da un test).
- e2e: `e2e/jam-escape-182.spec.ts`, a 360×640 e 412×915, in IT e in EN. Screenshot in
  `docs/test-evidence/182-uscita-ingorgo/`.
