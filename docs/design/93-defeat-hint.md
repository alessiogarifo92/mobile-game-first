# #93 — Sconfitta: "mancavano N pixel" e aiuto gratuito dopo 3 sconfitte

**Problema.** Il pannello di ingorgo dice solo che il gioco si è bloccato: non dice quanto mancava né dove. Chi perde
tre volte di fila sullo stesso livello non ha altra via d'uscita che riprovare a caso o guardare una pubblicità per
"+1 slot".

**Vincoli.** Testi in `src/core/i18n.ts` (IT/EN). Colori e misure solo da `src/game/theme.ts`. La logica in `src/core`
resta pura e testata. Il pannello deve stare tutto in 360×640 con tre bottoni. L'aiuto non è una pubblicità ed è
indipendente da "+1 slot" (#13). Il livello non cambia mai di nascosto: l'aiuto mostra una mossa, non semplifica il
livello.

## Cosa conta come "pixel mancante"
`missingCells` (`src/core/defeat.ts`) usa la stessa regola del gioco, `cellDone` (`src/core/rules.ts`). Un pixel manca
se non è dipinto, se è a metà miscela, se ha ancora il ghiaccio, se è nascosto o se è chiuso dal lucchetto. Le celle
vuote e le pietre non contano mai. I secchielli coperti non cambiano nulla: stanno nelle colonne, non sul quadro.
"Per un pelo!" compare con N ≤ 3 (`NEAR_MISS`).

## Opzione A — solo il numero, aiuto come "+1 slot" gratuito
Nel pannello si aggiunge soltanto la riga "Mancavano N pixel". Dopo tre sconfitte, "+1 slot" diventa gratis.
- **Pro**: nessuna UI nuova, quasi solo i18n.
- **Contro**: il numero da solo non dice *dove* si è sbagliato. Lo slot gratis mescola l'aiuto con la monetizzazione
  (#13 resta legata alla pubblicità) e non insegna niente: si va avanti di un passo nello stesso ingorgo.

## Opzione B — numero + mini-quadro, aiuto = prima mossa sicura su un nuovo tentativo (scelta)
- **Pannello**: sotto il testo, in grassetto, "Mancavano N pixel" (con "Mancava 1 pixel" per il singolare). Con N ≤ 3
  compare anche "Per un pelo!". Segue un mini-quadro del disegno com'era all'ingorgo: i pixel finiti hanno il loro
  colore, quelli mancanti sono un quadrato vuoto con bordo e una ✕ in `THEME.ink`.
- **Aiuto**: alla terza sconfitta di fila sullo stesso livello compare il bottone "👆 Suggerimento", tra "+1 slot e
  continua" e "Riprova". Apre un nuovo tentativo dello stesso livello, a nastro vuoto. La mano del tutorial indica
  la colonna di `solveFrom(stato).moves[0]` e la riga sotto il titolo dice "Suggerimento: lancia il secchiello sotto la
  mano". È un aiuto per tentativo: sparisce al primo lancio.
- **Contatore**: `progress.defeats[livello]` è salvato. Cresce a ogni ingorgo, si azzera quando il livello viene vinto
  ed è limitato a 99. Un salvataggio modificato a mano non può offrire l'aiuto su un livello già vinto.
- **Pro**: il mini-quadro mostra dove si è rimasti indietro e il numero quanto. L'aiuto insegna una mossa vera (dopo
  quella mossa il livello è ancora risolvibile, verificato dai test) senza toccare il livello né la pubblicità.
- **Contro**: il pannello cresce di circa 200 px. A 360×640 ci sta con tutti e tre i bottoni (verificato in e2e con
  `checkOnScreen`), ma non resta margine per altre righe.

## Opzione C — aiuto direttamente nella partita in corso
Il suggerimento compare sopra lo stato dell'ingorgo, senza ricominciare.
- **Contro**: all'ingorgo nessuna mossa salva più la partita (per questo è un ingorgo). `solveFrom` risponde solo a
  nastro vuoto e senza secchielli in rientro. Servirebbe un "annulla" che il gioco non ha, e mostrare una mossa che
  non esiste confonderebbe.

## Perché B
È l'unica che risponde a entrambe le domande ("quanto mancava", "dove") e che dà un aiuto che funziona davvero senza
cambiare il livello. Tiene inoltre l'aiuto fuori dalla monetizzazione, come chiede il ticket.

Evidenze: `docs/test-evidence/93-defeat-hint/` (01: prima sconfitta, 02: terza sconfitta con il bottone, 03: tentativo
con la mano), in IT e EN a 360×640.
