# Playtest agent per #182 (ghiaccio e uscita dall'ingorgo): report (Refs #182 #176)

Data: 10 novembre 2026 · Epic #66 · Protocollo: [`docs/playtest/protocollo-agent.md`](../playtest/protocollo-agent.md) · Harness: [`scripts/playtest/`](../../scripts/playtest/README.md) · Build: ramo `worktree-182-playtest-ice-jam-hint` a `b4fca98` · Schede: [`docs/playtest/sessioni/T18`](../playtest/sessioni/T18) (bozze), [`T19`](../playtest/sessioni/T19) · Variante `normale` · Turno precedente: [`2026-11-05-playtest-feedback-176.md`](2026-11-05-playtest-feedback-176.md) (T16–T17).

## In breve
- **Stessi profili di T16–T17**: P09 (si scoraggia presto) e P16 (prudente, mai "+1 slot"). Servono a verificare N1 (ghiaccio non riconosciuto) e N2 (il "!" non dice come uscire dall'ingorgo) di #176.
- **T18 (`U1-ONB` + `S09`) si è fermato al limite di 2 ore** con A09 a 1–7 e A16 a 1–5, tutti vinti e senza ingorghi. Restano solo le bozze `.draft.json`, fuori dall'aggregato. T19 ha ripreso solo `S09`, un pacchetto per sessione.
- **N1 (ghiaccio): risolto in S09.** Con la scheda "Pixel ghiacciati" di nuovo mostrata al primo livello pianificato con ghiaccio, 2 sessioni su 2 la capiscono a 81 (capito 4).
- **N2 (uscita dall'ingorgo): la riga e l'anello dorato aiutano.** A09 vince 10/10 al 1° tentativo con 0 ingorghi, e ai livelli più stretti (84–88, 90) scrive che il suggerimento l'ha guidato ogni volta. A16 lo segue a 81 e 82 e lo trova utile.
- **Corretto dopo il turno:** la riga «in ingorgo, "+1 slot"» è stata letta da A09 come un bottone da cercare subito, mentre "+1 slot" appare solo a ingorgo avvenuto. Ora è «Rischio ingorgo: se succede, usa "+1 slot"». Questa correzione non è passata da un nuovo playtest.
- **Un solo bug segnalato, non è del gioco** (T19-A16-B01, §2). Nessun errore di console.

## 1. Chi ha giocato
| Sessione | Profilo | Pacchetti | Livelli | Esito | Ingorghi · "+1 slot" | Divertimento · "domani lo riaprirei" |
|---|---|---|---|---|---|---|
| T18-A09 | P09 (IT 360×640, max 2) | U1-ONB + S09 | 1–7 | interrotto dal limite di 2 ore, 7/7 vinti | 0 | — (bozza) |
| T18-A16 | P16 (IT 360×640, max 5) | U1-ONB + S09 | 1–5 | interrotto dal limite di 2 ore, 5/5 vinti | 0 | — (bozza) |
| T19-A09 | P09 | S09 | 81–90 | piano finito, 10/10 al 1° tentativo | 0 · — | 3 · 3 |
| T19-A16 | P16 | S09 | 81–82 | 81 vinto; **82 abbandonato** (§2) | 0 · mai | 2 · 2 |

## 2. Il bug di T19-A16 a 82: un tap mancato, non un blocco
A16 segnala "gioco bloccato sulla scheda Corsia bloccata" (T19-A16-B01) e lascia il livello 82. Riprodotto con l'harness (stesso profilo, salvataggio a 82): l'agent toccava a y≈577, sopra il bottone "Ho capito" (y≈605). Toccato il bottone, la scheda si chiude normalmente. Menu e ricomincia sono bloccati dalla scheda per scelta. Resta una nota di usabilità minore: la scheda si chiude solo dal suo bottone (N4).

## 3. Cosa resta e cosa è nuovo
Un problema visto da 1–2 agent è un'ipotesi (§7 del protocollo). Le proposte servono a decidere se aprire un ticket.

| # | Problema | Sev. | Visto da | Proposta |
|---|---|---|---|---|
| N1 | **"+1 slot" citato prima che esista**: «in ingorgo, "+1 slot"» letto come un bottone da cercare | media | T19-A09 | **Corretto** in questa PR: «Rischio ingorgo: se succede, usa "+1 slot"» |
| N2 | **Due schede di fila a 85** (Pietra e Corsia bloccata): "troppo testo" | bassa | T19-A09 | Mostrare la seconda scheda al livello dopo, o unirle in una sola |
| N3 | **Livelli lunghi con tanti secchielli piccoli stancano** (84–90) | bassa | T19-A09 | Da pesare sulla curva di S09 con il solver prima di cambiare livelli |
| N4 | **La scheda si chiude solo dal bottone**: un tap appena sopra non fa nulla e sembra un blocco | bassa | T19-A16 | Chiudere la scheda anche toccando fuori dal testo, o ingrandire l'area del bottone |
| N5 | **Tap sugli slot "che non rispondono" a 90** mentre il nastro è pieno | bassa | T19-A09 | Un feedback breve sul tap rifiutato a nastro occupato, come i cerchi di #176 |
| N6 | **Dalla mappa non è chiaro come entrare in un livello** all'inizio | media | T18-A09, T18-A16 | Evidenziare il livello aperto sulla mappa al primo avvio (pulsazione o freccia) |
