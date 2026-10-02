# Pubblicare Mix & Splash su Google Play: requisiti e passi (ticket #11)

Data: 2 ottobre 2026 · Ambito: account, firma, requisiti tecnici, scheda store, dichiarazioni, CI · Costo totale minimo: **25 $ una tantum**

## Come è stato verificato
- Ogni requisito qui sotto viene da una fonte ufficiale Google, consultata il 2 ottobre 2026. Il link sta accanto a ogni affermazione e tutte le fonti sono in fondo.
- **developer.android.com** è stato letto direttamente (target API, App Bundle, firma, 16 KB, verifica sviluppatori, Data safety).
- **support.google.com (Play Console Help)** non è raggiungibile dalla rete del container usato per questo lavoro (il proxy blocca il dominio). Il testo di quelle pagine è stato letto dagli estratti delle pagine ufficiali indicizzati oggi dal motore di ricerca, mai da siti terzi né a memoria. Prima di ogni passo in Play Console conviene ricontrollare la pagina linkata: è la fonte che fa fede.
- Dove una cosa **non** è stata confermata da una fonte ufficiale, è scritto "non verificato".

## In breve
> **Decisione (2 ottobre 2026): nessuna spesa finché il gioco non convince.** L'account Play (25 $) si apre solo dopo il playtest (#42). Fino ad allora si fanno solo i passi a costo zero.

1. **Si parte subito con l'account** (25 $, verifica identità e dispositivo) e con la **ricerca di 12+ tester**: sono le due cose con i tempi più lunghi e non dipendono dal codice.
2. **Il percorso minimo dura circa 4–5 settimane** dalla creazione dell'account: test chiuso di 14 giorni pieni, poi la revisione della richiesta di accesso alla produzione (di solito fino a 7 giorni), poi la revisione dell'app (fino a 7 giorni per gli account nuovi).
3. **Lato tecnico siamo già quasi in regola.** `targetSdkVersion = 36` (`android/variables.gradle`) soddisfa il requisito in vigore dal 31 agosto 2026. Il gioco non raccoglie dati, quindi Data safety risponde "nessun dato raccolto". Mancano la firma di release (AAB + chiave di upload nei secrets), la privacy policy online e gli asset grafici della scheda.
4. **La prima release va caricata a mano** da Play Console. L'automazione dell'upload dalla CI viene dopo ed è facoltativa.

## 1. Account sviluppatore e verifica identità

| Requisito | Dettaglio | Fonte |
|---|---|---|
| Costo | **25 $ una tantum**, con carta di credito/debito | [Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) |
| Tipo di account | **Personale** (individui, studenti, hobbisti) oppure Organizzazione (richiede D-U-N-S). Per noi: personale | [Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en) |
| Dati richiesti (personale) | Nome sviluppatore (può essere diverso dal nome legale), nome legale, indirizzo legale, email e telefono di contatto per Google, email sviluppatore pubblica. Nome e indirizzo legali vengono dal profilo pagamenti Google collegato | [Required information to create a developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) |
| Cosa diventa pubblico | Nome legale, Paese ed email sviluppatore. **L'indirizzo completo diventa pubblico solo se si monetizza** (app a pagamento o IAP): da tenere presente per #13 | [Required information…](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) |
| Verifica identità | Possono chiedere un documento d'identità valido e una carta, entrambi intestati al nome legale. Email e telefoni si verificano con un codice monouso e devono restare attivi per tutta la vita dell'account | [Get started…](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en), [Verify your developer identity information](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en) |
| Verifica del dispositivo (account personali nuovi) | Bisogna dimostrare di avere un **telefono Android reale** con l'app *Play Console*: si scansiona un QR dalla console web. Serve un dispositivo fisico non rootato con **Android 10 o superiore**, e richiede meno di un minuto | [Device verification requirements for new developer accounts](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en) |
| Registrazione del package (nuovo dal 2026) | Con la *Android developer verification* ogni app su Play deve avere il package registrato. **Per un'app nuova la registrazione avviene da sola** quando la si crea in Play Console. Se il nome è già usato da un altro sviluppatore, la console ne chiede un altro | [Register on Google Play Console](https://developer.android.com/developer-verification/guides/google-play-console), [Policy announcement 15 luglio 2026](https://support.google.com/googleplay/android-developer/answer/17134731?hl=en) |

**Tempi.** Le pagine ufficiali non indicano quanto dura la verifica dell'identità (**non verificato**): conviene avviarla subito. La verifica del dispositivo dura meno di un minuto. Quella del telefono si può fare solo **dopo** la verifica d'identità e quella del dispositivo ([fonte](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en)).

> **Decisione (2 ottobre 2026): il package aspetta il nome definitivo (#16)**, quindi l'app in Play Console si crea solo dopo #16.
>
> **Package name definitivo.** `com.alessiogarifo.mixsplash` (`capacitor.config.ts`) diventa **permanente** al primo upload e viene registrato a nostro nome. Il *titolo* della scheda si può cambiare dopo, il package no. Il ticket #16 (nome definitivo) non blocca la pubblicazione se va bene un package neutro rispetto al marchio. Va però deciso prima di creare l'app in Play Console.

## 2. Regola del test chiuso per gli account personali nuovi
Fonte: [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).

- Vale per gli **account personali creati dopo il 13 novembre 2023**, quindi anche per il nostro.
- Prima di pubblicare in produzione serve un **test chiuso con almeno 12 tester iscritti senza interruzioni per almeno 14 giorni**. Il requisito era di 20 tester ed è stato ridotto a 12 a dicembre 2024.
- Chi si iscrive, resta meno di 14 giorni e poi esce **non conta**. Chi esce e rientra deve accumulare **14 giorni consecutivi**.
- I tester si aggiungono con una **lista di email** (fino a 2.000 per lista) o un **Google Group**. Ognuno deve aprire il **link di iscrizione** e accettare. Il link compare solo quando la release del test chiuso è *Pubblicata*, quindi dopo la sua revisione, non quando è in bozza.
- Dopo i 14 giorni si chiede l'**accesso alla produzione** dalla Dashboard. Il modulo ha tre sezioni: *About your closed test*, *About your app/game*, *About your production readiness*. La revisione **di solito dura 7 giorni o meno** e l'esito arriva per email.
- Il **test interno** è facoltativo e non conta per i 12×14. Serve però a provare l'AAB su pochi dispositivi prima del test chiuso.

**Raccomandazione (mia, non della fonte):** reclutare **15–20 tester**, così uno o due che escono non fanno ripartire il conteggio. Ogni tester deve avere un account Google e un telefono Android. Il playtest #42 (10–20 persone) può usare **lo stesso test chiuso**: si ottiene il feedback sulla difficoltà e intanto si soddisfa la regola. Durante il test, chiedere ai tester feedback concreto (bug, livelli frustranti): il modulo per la produzione chiede come è andato il test e cosa è cambiato.

## 3. App Bundle firmato, chiave di upload e Play App Signing
Fonti: [Sign your app](https://developer.android.com/studio/publish/app-signing), [About Android App Bundles](https://developer.android.com/guide/app-bundle), [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).

- **AAB obbligatorio** per le app nuove dall'agosto 2021. L'APK debug che pubblichiamo oggi su GitHub non è caricabile su Play.
- **Play App Signing obbligatorio** per le app nuove. Ci sono due chiavi:
  - **chiave di firma dell'app**: la tiene Google e firma gli APK installati dagli utenti. Non cambia mai.
  - **chiave di upload**: la teniamo noi, firma l'AAB prima del caricamento. Deve essere RSA da 2048 bit o più, in un keystore Java (`.jks`).
- Secondo la pagina Play Console, oggi un'app nuova viene **iscritta in automatico** a Play App Signing con chiavi generate da Google. La pagina la descrive come firma "ibrida, pronta per il quantum". Non serve fornire una chiave di firma nostra, ed è la scelta consigliata.
- **Validità della chiave**: almeno **25 anni**. Per Google Play la validità deve finire **dopo il 22 ottobre 2033**.
- **Se la chiave di upload si perde** non si perde l'app. Si genera una nuova chiave e si chiede un **reset della chiave di upload** in Play Console (*Protected with Play → Play Store protection → Manage Play app signing → Request upload key reset*). La chiave di firma dell'app non cambia.
- **Credenziali fuori dal repo**: la guida ufficiale indica di caricare password e alias da un file o da variabili non versionati e di non scriverli in `build.gradle`. Per noi:
  - keystore codificato in base64 nel secret `ANDROID_UPLOAD_KEYSTORE_BASE64`;
  - `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` e `ANDROID_UPLOAD_KEY_PASSWORD` come secrets;
  - in CI il keystore si decodifica in un file temporaneo del runner. `.gitignore` esclude già `*.jks` e `*.keystore`, tranne la chiave debug pubblica.
- **Copia di sicurezza**: oltre al secret di GitHub, che non si può rileggere, il keystore e le password vanno conservati **offline**, per esempio nel password manager. Senza copia, ogni smarrimento richiede il reset.
- **Capacitor**: per Capacitor un'app Android si pubblica come qualsiasi app nativa. L'AAB di release esce da `./gradlew bundleRelease` in `android/app/build/outputs/bundle/release/` ([Deploying to Google Play](https://capacitorjs.com/docs/android/deploying-to-google-play), [cap build](https://capacitorjs.com/docs/v4/cli/commands/build)). In CI conviene chiamare Gradle direttamente, come fa già `android.yml`.

> **APK debug e app di Play non convivono.** Hanno lo stesso `applicationId` ma firme diverse (la nostra chiave debug pubblica contro la chiave Google). Chi ha installato l'APK di GitHub deve disinstallarlo prima di installare da Play, e **perde i progressi**. Da decidere nel ticket R5: un suffisso `.debug` per le build di test, oppure spostare i tester su Play.

## 4. Requisiti tecnici alla data

| Requisito | Stato per Mix & Splash | Fonte |
|---|---|---|
| **Target API**: dal **31 agosto 2026** app nuove e aggiornamenti devono puntare ad **Android 16 (API 36)** o superiore. Le app esistenti sotto API 35 diventano invisibili agli utenti nuovi con Android più recente. Proroga richiedibile fino al 1° novembre 2026 | ✅ `targetSdkVersion = 36`, `compileSdkVersion = 36` | [Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk) |
| **App Bundle**, dimensione massima scaricata 4 GB | ✅ da produrre (ticket R1/R2); il gioco pesa pochi MB | [About Android App Bundles](https://developer.android.com/guide/app-bundle) |
| **Pagine di memoria da 16 KB**: obbligatorie per le app con target ≥ 35 **che hanno codice nativo**. Dal **1° febbraio 2027** gli aggiornamenti non conformi vengono bloccati. Le app solo Java/Kotlin sono già conformi | ⚠️ Capacitor + WebView non dovrebbe portare librerie `.so`. Da **verificare** nella CI di release (nessun `lib/*/*.so` nell'AAB) e da ricontrollare quando arrivano plugin nativi (AdMob, #13) | [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes) |
| **Version code** crescente a ogni upload | ⚠️ oggi `android.yml` usa `run_number + 100`, contatore del solo workflow debug. Il workflow di release deve usare uno schema che cresca sempre (ticket R2) | (requisito standard di Play: ogni upload deve avere un versionCode maggiore) |

## 5. Scheda dello store
Fonti: [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), [Best practices for your store listing](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en), [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en), [Icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications).

| Elemento | Specifica | Note per noi |
|---|---|---|
| Titolo | ≤ **30** caratteri | "Mix & Splash" in attesa di #16 |
| Descrizione breve | ≤ **80** caratteri | IT + EN, come il gioco (#19) |
| Descrizione completa | ≤ **4.000** caratteri | niente classifiche, prezzi o "n. 1" (policy Metadata) |
| Icona | **512×512**, PNG a 32 bit con alfa, ≤ **1024 KB** | `public/icons/icon-512.png` esiste già: va controllata rispetto alle [specifiche icona](https://developer.android.com/distribute/google-play/resources/icon-design-specifications) (Play applica da sé maschera e ombra) |
| Feature graphic | **1024×500**, JPEG o PNG a 24 bit **senza alfa** | da creare, disegnata via codice come il resto (nessun asset di terzi) |
| Screenshot | min 2. Ogni lato tra **320 e 3840 px**, JPEG o PNG a 24 bit senza alfa, **fino a 8 per tipo di dispositivo**. Per comparire nei formati di raccomandazione servono **≥ 4 screenshot ≥ 1080 px**, in verticale 9:16 (**min 1080×1920**) | si possono generare con Playwright a 1080×1920 (Chromium è già nel progetto) |
| Video | facoltativo (YouTube) | dopo |

## 6. Privacy policy
Fonti: [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

- **Obbligatoria per tutte le app**, anche per quelle che non accedono a dati personali o sensibili.
- Il link va **sia in Play Console**, nel campo apposito, **sia dentro l'app** (link o testo).
- L'URL deve essere **attivo, pubblico, non geobloccato, non un PDF** e non modificabile da altri.
- Il contenuto deve dire, in modo veritiero, che il gioco **non raccoglie né condivide dati**. I progressi restano sul dispositivo (`src/core/progress.ts`, localStorage o Capacitor Preferences) e non c'è backend. Va dato un contatto (email sviluppatore). Va **aggiornata prima** di introdurre analytics (#14) o ads (#13).
- **Hosting a costo zero**: una pagina statica pubblica. Come indica la strategia, GitHub Pages su un repo privato richiede il piano Pro, quindi conviene Cloudflare Pages, anche insieme alla demo web.

## 7. Data safety, classificazione IARC e altre dichiarazioni
Le dichiarazioni si compilano in **Policy and programs → App content**. Sono richieste **anche per le app nei soli test chiusi**, quindi vanno compilate prima di avviare il test chiuso.

| Dichiarazione | Risposta prevista per Mix & Splash (oggi) | Fonte |
|---|---|---|
| **Data safety** | Obbligatoria anche per chi non raccoglie dati e richiede il link alla privacy policy. Risposta: **nessun dato raccolto né condiviso**. I dati elaborati **solo sul dispositivo** e mai inviati fuori non vanno dichiarati come raccolti. Se un SDK terzo raccoglie dati, va dichiarato: da rifare con #13/#14 | [Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [Declare your app's data use](https://developer.android.com/privacy-and-security/declare-data-use) |
| **Classificazione dei contenuti (IARC)** | Obbligatoria: le app senza classificazione vengono rimosse. Si compila il questionario in Play Console e la classificazione arriva **subito**, **gratis**, con un certificato via email. Il nostro gioco non ha violenza, linguaggio, gioco d'azzardo o chat, quindi ci si aspetta la fascia più bassa (es. PEGI 3) (**non verificato** finché non si compila) | [Content ratings](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en), [IARC FAQ](https://globalratings.com/faq/) |
| **Pubblico di destinazione** | Va dichiarata la fascia d'età. **Se include minori di 13 anni** si applicano le *Families Policy*, con requisiti sui dati e solo SDK pubblicitari certificati per famiglie. Google può rivedere la dichiarazione se grafica e testi sembrano rivolti ai bambini. **Decisione per l'utente**, vedi sotto | [Target audience and content](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en), [Families policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en) |
| **Annunci** | "No" oggi. Con #13 diventa "Sì" e la scheda mostra "Contiene annunci" | [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en) |
| **Accesso all'app** | Nessun login, quindi tutte le funzioni sono accessibili senza istruzioni | idem |
| **App governative, funzioni finanziarie, salute, notizie** | "No" a tutte, ma vanno comunque compilate | [Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en), [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en) |
| **Status di "trader" UE (Digital Services Act)** | **Non verificato**: non ho trovato una pagina ufficiale raggiungibile che lo descriva per gli account personali. Se la console lo chiede, per un gioco gratuito senza monetizzazione la risposta tipica è "non trader". Con la monetizzazione (#13) va rivalutato | — |

**Decisione sul pubblico di destinazione (confermata dall'utente il 2 ottobre 2026: 13+).** Consiglio **13+**: le fasce 13–15, 16–17 e 18+, senza minori di 13 anni. Così si evitano i requisiti Families finché non c'è una scelta voluta su ads e analytics (#13, #14), e la scheda resta senza immagini o parole rivolte ai bambini. L'alternativa "anche bambini" è possibile oggi, perché non raccogliamo dati. Però vincola #13 (solo SDK certificati per famiglie, niente annunci personalizzati) e #14 (Firebase Analytics con limitazioni). Scelta confermata: **13+**.

## 8. Revisione e tempi di pubblicazione
Fonti: [Publish your app](https://support.google.com/googleplay/android-developer/answer/9859751?hl=en), [Control when app changes are reviewed and published](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en).
- Per **alcuni account**, tra cui quelli nuovi, la revisione **può arrivare a 7 giorni**, a volte di più. Google consiglia **almeno una settimana di margine** tra invio e uscita.
- Il **Managed publishing** permette di decidere quando pubblicare una release già approvata. È utile per far coincidere l'uscita con un annuncio.

## 9. CI per la release firmata
Stato attuale: `.github/workflows/android.yml` costruisce solo l'APK **debug**, firmato con la chiave debug pubblica committata, e lo pubblica nelle GitHub Releases.

Proposta (ticket R1, R2, R4):
1. **Firma in Gradle** (R1). In `android/app/build.gradle`, un `signingConfigs.release` che legge keystore e password da **variabili d'ambiente**. Se mancano, la build release resta non firmata o fallisce in modo chiaro, e in locale e nella CI dei PR non serve nessun segreto. Nessuna password nel repo.
2. **Workflow `android-release.yml`** (R2). Parte su tag `v*` senza suffisso, oppure a mano con `workflow_dispatch`, e mai sui PR, così un fork non vede i secrets. I passi:
   - `npm ci`, `npm run build`, `npx cap sync android`;
   - decodifica di `ANDROID_UPLOAD_KEYSTORE_BASE64` in `$RUNNER_TEMP`;
   - `./gradlew bundleRelease -PversionCode=…`;
   - verifica che l'AAB sia firmato con la chiave di upload (impronta SHA-256 confrontata con quella attesa, salvata come variabile non segreta);
   - controllo che non ci siano `.so`, per i 16 KB;
   - upload dell'AAB come **artefatto** con conservazione breve;
   - cancellazione del keystore dal runner, anche in caso di errore.
   - Gira su runner Linux ospitati da GitHub, come la build debug: costo trascurabile rispetto ai 2.000 minuti/mese gratis.
3. **Primo upload a mano.** Il primo AAB si carica a mano in Play Console, nel test interno o chiuso. È lì che l'app viene creata, il package registrato e Play App Signing attivato. Prima di questo non c'è niente su cui l'API possa lavorare ([Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)).
4. **Upload automatico, facoltativo** (R4), dopo il primo upload:
   - un **service account** Google Cloud con la *Google Play Developer API* attiva, invitato in Play Console (*Users and permissions*) con i soli permessi di release;
   - la chiave JSON va nel secret `PLAY_SERVICE_ACCOUNT_JSON`;
   - il workflow carica l'AAB sulla traccia `internal`, mai direttamente in produzione.
   - Fonti: [Google Play Developer API – Getting started](https://developers.google.com/android-publisher/getting_started), [Add developer account users](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en).
   - Lo strumento di upload (action di terzi, Gradle Play Publisher o fastlane) è una **dipendenza nuova**: per le regole del progetto passa da un verdetto `market-analyst` su licenza, manutenzione e costo.

## 10. Checklist ordinata (costi e tempi)

**Da avviare subito** perché ha tempi lunghi o non dipende dal codice: passi 1, 2, 3 e 4.

| # | Passo | Chi | Costo | Tempo | Dipende da |
|---|---|---|---|---|---|
| 1 | **Creare l'account personale** Play Console, pagare, verificare identità, email e telefono | utente | **25 $** | verifica identità: tempo non dichiarato, partire ora | — |
| 2 | **Verifica del dispositivo** con l'app Play Console su un Android ≥ 10 | utente | 0 | < 1 min | 1 |
| 3 | **Reclutare 15–20 tester** (account Google + telefono Android) e creare la lista email o un Google Group. Coordinare con il playtest #42 | utente | 0 | 1–2 settimane di passaparola, in parallelo | — |
| 4 | **Decidere il package definitivo** (#16, oppure tenere `com.alessiogarifo.mixsplash`) e la **fascia d'età** (§7) | utente | 0 | — | — |
| 5 | **Generare la chiave di upload** (keytool, RSA ≥ 2048, validità ≥ 25 anni), salvarla offline e nei secrets del repo | utente, con istruzioni del ticket R1 | 0 | 15 min | — |
| 6 | **Firma release + workflow AAB** (R1, R2) | Claude | 0 | 1 ticket | 5 |
| 7 | **Privacy policy online** + link nel gioco (R3) | Claude, e l'utente per hosting e email | 0 | 1 ticket | — |
| 8 | **Asset della scheda**: icona 512, feature graphic, ≥ 4 screenshot 1080×1920, testi IT/EN (R6) | Claude | 0 | 1 ticket | 4 (titolo) |
| 9 | **Creare l'app in Play Console**, compilare *App content* (Data safety, IARC, pubblico, annunci, altre dichiarazioni) e la scheda | utente, con la guida del ticket R7 | 0 | 1–2 ore | 1, 2, 4, 7, 8 |
| 10 | **Primo upload a mano** dell'AAB nel **test interno**, prova su 2–3 telefoni | utente | 0 | 1 giorno | 6, 9 |
| 11 | **Release nel test chiuso** → revisione → link di iscrizione ai tester. Il conteggio dei 14 giorni parte quando i tester si iscrivono | utente | 0 | revisione fino a ~7 giorni + **14 giorni** | 3, 10 |
| 12 | **Richiesta di accesso alla produzione** (3 sezioni di domande) | utente | 0 | di solito ≤ 7 giorni | 11 |
| 13 | **Release di produzione**, con managed publishing per scegliere il giorno | utente | 0 | revisione fino a ~7 giorni | 12 |
| 14 | (facoltativo) **Upload automatico** in `internal` dalla CI (R4) | Claude | 0 | 1 ticket | 10 |

**Totale**: **25 $**. Dal giorno in cui l'account è verificato, almeno **~4–5 settimane**: circa 1 settimana di preparazione e revisione del test chiuso, 2 settimane di test, 1 settimana di revisione per la produzione e fino a 1 settimana di revisione dell'app. I passi 6–8 si fanno **durante** la verifica dell'account e il reclutamento dei tester, quindi non allungano il percorso.

## 11. Rischi e cose da tenere d'occhio
- **Verifica sviluppatori Android e APK di GitHub.** Dal 30 settembre 2026, nelle regioni pilota (Indonesia, Singapore, Thailandia), sui dispositivi certificati si installano solo app di sviluppatori verificati con package registrato. Dal **2027** la regola si estende a tutto il mondo. Le installazioni via **ADB** sono esenti, ma l'APK debug scaricato da GitHub non passa da ADB. Per continuare a distribuirlo fuori da Play nel 2027 bisognerà registrare il package e la chiave che lo firma (la console permette più chiavi per package), oppure spostare i tester sul test interno o chiuso di Play. La nostra chiave debug è **pubblica** (committata), quindi non è adatta a essere registrata come "nostra". Fonti: [FAQ verifica sviluppatori](https://developer.android.com/developer-verification/guides/faq), [blog marzo 2026](https://developer.android.com/blog/posts/android-developer-verification-rolling-out-to-all-developers-on-play-console-and-android-developer-console). → ticket R5.
- **Proroga del target API.** Il requisito di ogni anno sale ad agosto. Nel 2027 sarà probabilmente API 37 (**non verificato**, la pagina oggi indica solo il 2026): va aggiornato insieme a Capacitor.
- **Il conteggio del test chiuso si azzera** se un tester esce: per questo il margine di 15–20 tester.
- **Monetizzazione (#13) e analytics (#14)** cambiano Data safety, privacy policy, dichiarazione annunci, eventualmente il pubblico e i 16 KB (SDK nativi). Prevederli come "aggiornamento dichiarazioni" in quei ticket.

## 12. Ticket di implementazione
Aperti nella milestone **Store release** il 2 ottobre 2026:

| Report | Ticket |
|---|---|
| R1 — firma di release | #79 |
| R2 — workflow AAB | #80 |
| R3 — privacy policy | #81 |
| R5 — APK debug e verifica sviluppatori (research) | #83 |
| R6 — asset della scheda | #82 |
| R7 — passi manuali in Play Console | #84 |

R4 (upload automatico) non è aperto: va aperto dopo il primo upload manuale. Il testo dei ticket sotto è la versione proposta; quella su GitHub fa fede.

---

### R1 — Firma di release: chiave di upload e `signingConfig` da variabili d'ambiente
**Obiettivo**: poter produrre un AAB di release firmato con la chiave di upload, senza segreti nel repo.

**Da fare**
- Istruzioni (in `docs/release/android-signing.md`) per generare la chiave **una volta**: `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000` (≈ 27 anni: più dei 25 consigliati e oltre il 22/10/2033). Comandi con percorsi assoluti e indicazione della shell host.
- Istruzioni per salvarla nei secrets del repo: `ANDROID_UPLOAD_KEYSTORE_BASE64` (`base64 -w0 upload.jks`), `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`. **Copia offline obbligatoria** (password manager). Procedura di reset della chiave di upload in caso di smarrimento.
- `android/app/build.gradle`: `signingConfigs.release` letto da variabili d'ambiente (`ANDROID_UPLOAD_KEYSTORE_PATH`, …), applicato a `buildTypes.release` **solo se presenti**. Senza variabili, la build debug e la CI dei PR restano invariate.
- Verificare che `.gitignore` escluda `*.jks`/`*.keystore` (già così, tranne la chiave debug pubblica) e aggiungere un controllo in CI che fallisce se nel repo compare un keystore diverso da `android/app/debug.keystore`.

**Criteri di accettazione**: in locale, con le variabili impostate su un keystore di prova, `./gradlew bundleRelease` produce un AAB firmato (`jarsigner -verify` / `apksigner` sull'APK estratto con bundletool); senza variabili, `assembleDebug` funziona come oggi. Nessun segreto nel diff.

**Collegamenti**: #11 (report `docs/reports/2026-10-02-google-play.md` §3).

---

### R2 — CI: workflow di release AAB firmato
**Obiettivo**: ogni tag di versione produce un AAB firmato pronto da caricare su Play.

**Da fare**
- `.github/workflows/android-release.yml`: trigger su tag `v*` senza suffisso `-` e `workflow_dispatch`. **Mai** su `pull_request`. `permissions: contents: read`.
- Passi:
  - `npm ci`, `npm run build`, `npx cap sync android`;
  - decodifica del keystore in `$RUNNER_TEMP`;
  - `./gradlew bundleRelease --no-daemon -PversionCode=<schema>`;
  - rimozione del keystore in uno step `if: always()`.
- **Schema del versionCode** monotono e indipendente dal workflow, per esempio derivato da `versionName` (`MAJOR*10000 + MINOR*100 + PATCH`, con build in coda), più un test che lo verifica. Allineare `versionName` di `build.gradle` a `package.json`.
- Verifiche:
  - l'impronta SHA-256 del certificato di upload nell'AAB coincide con la variabile di repo `ANDROID_UPLOAD_CERT_SHA256` (non segreta);
  - nessuna libreria nativa (`unzip -l` dell'AAB senza `lib/*/*.so`), per il requisito delle pagine da 16 KB;
  - `targetSdkVersion` ≥ 36.
- Artefatto `mix-and-splash-<tag>.aab`, `retention-days: 14`. Non va allegato alle GitHub Releases pubbliche.

**Criteri di accettazione**: un `workflow_dispatch` su un branch di prova produce l'AAB firmato e le verifiche passano. Una prova senza secrets fallisce con un messaggio chiaro. Il workflow debug esistente è invariato.

**Dipende da**: R1.

---

### R3 — Privacy policy pubblica e link nel gioco
**Obiettivo**: soddisfare la User Data policy di Google Play (privacy policy obbligatoria per tutte le app).

**Da fare**
- Testo IT + EN in `public/privacy/` (HTML statico), veritiero sullo stato attuale:
  - nessun dato raccolto né condiviso;
  - progressi salvati solo sul dispositivo;
  - nessun account, nessun SDK di terzi;
  - contatto: email sviluppatore;
  - data di aggiornamento.
- Pubblicazione su un URL **pubblico, non geobloccato, non PDF**. Proposta: Cloudflare Pages a costo zero (vedi strategia §2). Il deploy fa parte del ticket.
- Link "Privacy" nelle Impostazioni del gioco (testi in `src/core/i18n.ts`, stile da `src/game/theme.ts`) che apre l'URL esterno. Su Android, il browser di sistema.
- Nota nei ticket #13 e #14: la policy va aggiornata **prima** di introdurre SDK che raccolgono dati.

**Criteri di accettazione**: URL raggiungibile da browser anonimo; link visibile e funzionante nel gioco (e2e Playwright: il link esiste e punta all'URL); test delle chiavi i18n verde.

---

### R4 — (facoltativo) Upload automatico dell'AAB sulla traccia interna di Play
**Obiettivo**: niente più upload a mano dopo il primo.

**Da fare**
- Verdetto `market-analyst` sullo strumento: action di terzi per l'upload, Gradle Play Publisher o fastlane `supply`. Criteri: licenza, manutenzione, costo, superficie d'attacco sui secrets.
- Istruzioni per l'utente:
  - progetto Google Cloud con la Google Play Developer API attiva;
  - service account con chiave JSON;
  - invito in Play Console → *Users and permissions*, con permessi limitati alle release di questa app.
- Secret `PLAY_SERVICE_ACCOUNT_JSON`.
- Il workflow R2 carica sulla traccia **internal**, con la release in bozza o completata. La promozione al test chiuso o alla produzione resta manuale in Play Console.

**Dipende da**: R2 e dal **primo upload manuale** (checklist passo 10).

---

### R5 — Decisione: APK debug di GitHub accanto all'app di Play e verifica sviluppatori 2027
**Domanda**: oggi l'APK debug e l'app di Play hanno lo stesso `applicationId` e firme diverse, quindi non si aggiornano a vicenda e chi passa dall'uno all'altro perde i progressi. Dal 2027 l'installazione di APK non registrati sui dispositivi certificati richiede la verifica dello sviluppatore, e la chiave debug è pubblica.

**Opzioni da valutare**
- (a) `applicationIdSuffix ".debug"` + nome "Mix & Splash (test)" per le build debug. Le due app convivono. Chi ha l'APK debug attuale fa un'ultima reinstallazione.
- (b) Abbandonare l'APK su GitHub per i tester e usare solo il test interno o chiuso di Play.
- (c) Registrare il package debug con una chiave debug **privata** nuova (nei secrets).

Deliverable: raccomandazione con pro e contro, poi la modifica a `build.gradle`/`android.yml` e a `scripts/apk-smoke.sh`. Lo smoke oggi verifica la firma con la chiave debug committata e l'aggiornamento sul posto.

---

### R6 — Asset della scheda Google Play (icona, feature graphic, screenshot, testi)
**Obiettivo**: tutti gli asset richiesti, generati da codice e riproducibili, senza grafica di terzi.

**Da fare**
- Script `scripts/store-assets.ts` (Playwright + build di produzione) che genera in `docs/store/` (o `store/`):
  - **icona 512×512** PNG 32 bit, ≤ 1024 KB (da `public/icon.svg`, controllata rispetto alle specifiche icona di Play);
  - **feature graphic 1024×500** PNG 24 bit **senza alfa**;
  - **≥ 4 screenshot 1080×1920** (9:16) senza alfa, in IT e in EN: mappa, livello con mixing, vittoria, album.
- Testi in IT ed EN: titolo ≤ 30, descrizione breve ≤ 80, descrizione completa ≤ 4.000 caratteri, senza superlativi o classifiche vietati dalla policy Metadata. Testi in un file versionato, con un test che controlla le lunghezze.
- Colori e font solo da `src/game/theme.ts` (direzione "Gouache Studio"). Nessuna immagine o parola rivolta ai bambini se la decisione sul pubblico è 13+.

**Criteri di accettazione**: un test verifica dimensioni, assenza di alfa dove richiesto e peso dei file; un test verifica le lunghezze dei testi; gli asset rigenerati sono identici a parità di codice.

---

### R7 — (operativo, utente) Play Console: account, App content, test chiuso, produzione
**Obiettivo**: tracciare i passi manuali in Play Console (checklist §10, passi 1–4 e 9–13).

**Checklist**
- [ ] Account personale creato, 25 $ pagati, identità, email e telefono verificati
- [ ] Verifica del dispositivo con l'app Play Console
- [ ] Package definitivo e fascia d'età decisi
- [ ] 15–20 tester con account Google e Android, in lista email o Google Group
- [ ] App creata in Play Console e package registrato
- [ ] App content compilato: privacy policy, Data safety ("nessun dato"), IARC, pubblico, annunci "No", accesso all'app, dichiarazioni governo/finanza/salute/notizie
- [ ] Scheda store compilata con gli asset di R6
- [ ] Primo AAB in **test interno**, provato su 2–3 telefoni
- [ ] Release in **test chiuso** approvata, link di iscrizione inviato
- [ ] 14 giorni consecutivi con ≥ 12 tester iscritti (annotare la data di inizio)
- [ ] Richiesta di accesso alla produzione inviata e approvata
- [ ] Release di produzione (managed publishing)

**Collegamenti**: #42 (il playtest con persone usa lo stesso test chiuso), #16 (nome), #13/#14 (aggiornare le dichiarazioni prima di introdurre ads o analytics).

## Fonti (consultate il 2 ottobre 2026)
**developer.android.com** (lette direttamente)
- [Target API level requirements for Google Play apps](https://developer.android.com/google/play/requirements/target-sdk)
- [About Android App Bundles](https://developer.android.com/guide/app-bundle)
- [Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
- [Android developer verification — Register on Google Play Console](https://developer.android.com/developer-verification/guides/google-play-console)
- [Android developer verification — FAQ](https://developer.android.com/developer-verification/guides/faq)
- [Android developer verification: rolling out to all developers (blog, marzo 2026)](https://developer.android.com/blog/posts/android-developer-verification-rolling-out-to-all-developers-on-play-console-and-android-developer-console)
- [Declare your app's data use](https://developer.android.com/privacy-and-security/declare-data-use)
- [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)

**support.google.com — Play Console Help** (dagli estratti ufficiali indicizzati, vedi "Come è stato verificato")
- [Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)
- [Verify your developer identity information](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en)
- [Device verification requirements for new developer accounts](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en)
- [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)
- [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)
- [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Best practices for your store listing](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en)
- [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en)
- [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Content ratings](https://support.google.com/googleplay/android-developer/answer/9898843?hl=en)
- [Manage target audience and app content settings](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en)
- [Google Play Families policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [Provide information for the Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en)
- [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- [Publish your app](https://support.google.com/googleplay/android-developer/answer/9859751?hl=en)
- [Control when app changes are reviewed and published](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en)
- [Add developer account users and manage permissions](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en)
- [Policy announcement: July 15, 2026](https://support.google.com/googleplay/android-developer/answer/17134731?hl=en)

**Altre fonti ufficiali**
- [Google Play Developer API — Getting started](https://developers.google.com/android-publisher/getting_started) (dagli estratti indicizzati)
- [IARC — FAQ](https://globalratings.com/faq/) (dagli estratti indicizzati)
- [Capacitor — Deploying to Google Play](https://capacitorjs.com/docs/android/deploying-to-google-play) e [cap build](https://capacitorjs.com/docs/v4/cli/commands/build) (dagli estratti indicizzati)
