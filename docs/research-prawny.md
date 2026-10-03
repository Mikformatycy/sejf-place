# Research prawny: Teczka

**Stan weryfikacji: 3 października 2026 r.** Teksty ustaw pobrano z API Sejmu (teksty ujednolicone Kancelarii Sejmu z datami podanymi przy każdym akcie), prawo UE z EUR-Lex, a dane kontaktowe z oficjalnych stron instytucji.

> **Zastrzeżenie.** To nie jest porada prawna. Dokument zbiera przepisy i fakty potrzebne do zaprojektowania aplikacji. Każde zastosowanie w konkretnej sprawie wymaga konsultacji z prawniczką lub prawnikiem. Teksty ujednolicone Kancelarii Sejmu nie są źródłem prawa (wiążący jest Dziennik Ustaw), ale pokazują aktualne brzmienie po zmianach.

**Oznaczenia**

| Znak | Znaczenie |
|---|---|
| ✅ | Zweryfikowane w źródle pierwotnym (tekst aktu, oficjalna strona). |
| 🟡 | Znane tylko ze źródeł wtórnych (omówienia, strony lokalnych urzędów). Oryginału nie udało się sprawdzić. |
| ❓ | **Nie wiem / wymaga konsultacji.** Nie zgaduję. |

---

## 0. Najważniejsze wnioski dla projektu

1. ✅ **Przemoc ekonomiczna jest w ustawowej definicji przemocy domowej.** To art. 2 ust. 1 pkt 1 lit. d UPPD, wprowadzony nowelizacją, która weszła w życie 22.06.2023 r. Lit. e obejmuje także przemoc „za pomocą środków komunikacji elektronicznej”.
2. ✅ **Aplikacja nie wypełnia Niebieskiej Karty.** Formularz NK-A wypełnia przedstawiciel uprawnionej służby w obecności osoby doznającej przemocy (§ 2 ust. 2 i 5 rozporządzenia). Teczka przygotowuje chronologię zgodną z kategoriami formularza NK-A (sekcja IV) i z „historią przemocy” z NK-C. Ma ona pomóc w rozmowie, a nie zastąpić formularz.
3. ✅ **Niekwalifikowany znacznik czasu też może być dowodem** (art. 41 ust. 1 eIDAS). Tylko **kwalifikowany** daje domniemanie dokładności czasu i integralności danych (art. 41 ust. 2). FreeTSA, którego używamy w demo, nie jest kwalifikowany. W produkcji warto użyć kwalifikowanego dostawcy z rejestru NCCert (pkt 7).
4. ✅ **Znacznik czasu dowodzi czego innego, niż często się zakłada.** Pokazuje, że dane istniały najpóźniej w chwili T i od tej chwili się nie zmieniły. **Nie dowodzi**, kiedy wydarzyło się zdarzenie, ani że zdjęcie przedstawia prawdę. Tak to komunikujemy w aplikacji i w pitchu.
5. ✅ **W kodeksie karnym nie ma odrębnego przestępstwa „przemocy ekonomicznej”** (stan na 28.08.2026). Takie zachowania mogą mieć znaczenie np. przy art. 207 kk (znęcanie się), art. 209 kk (alimenty) albo art. 191 § 1a kk. Kwalifikację ocenia prokurator i sąd ❓.
6. ✅ **Nagrania:**
   - **Postępowanie karne.** Art. 168a kpk w obecnym brzmieniu nie pozwala uznać dowodu za niedopuszczalny tylko dlatego, że uzyskano go z naruszeniem prawa (są wyjątki).
   - **Postępowanie cywilne.** SN w postanowieniu I CSK 2855/24 dopuszcza nagrania zrobione bez wiedzy rozmówcy po weryfikacji autentyczności 🟡.
   - **Ryzyko.** Nagrywanie **cudzych** rozmów może podlegać art. 267 § 3 kk.
7. ✅ **Ochrona doraźna i sądowa.**
   - Policyjny nakaz opuszczenia mieszkania, zakaz zbliżania się, kontaktu i wstępu tracą moc po **14 dniach**, chyba że sąd przedłuży je zabezpieczeniem (art. 15ak ustawy o Policji).
   - Sąd może orzec takie środki na podstawie art. 11a i 11aa UPPD.
8. ❓ **RODO.**
   - Dane w Teczce zostają na telefonie, a dostawca aplikacji nie ma do nich dostępu.
   - Opcjonalne AI to przetwarzanie danych szczególnych kategorii przez podmiot trzeci. Wymaga wyraźnej zgody, umowy powierzenia i najpewniej DPIA, więc przed pilotażem trzeba to skonsultować z IOD.
9. ✅ **Sklepy z aplikacjami zakazują ukrytych, nieudokumentowanych funkcji** (Apple 2.3.1, Google Play). Google wymaga też, żeby tytuł i ikona odpowiadały funkcji. Przełączanie ikon jest więc **realnym ryzykiem przy publikacji** ❓.
10. ✅ **Numery z formularza NK-B (2023) są częściowo nieaktualne.**
    - Od 1.09.2026 r. Linia Pomocy Pokrzywdzonym działa pod numerem **116 006**. Numer +48 222 309 900 służy już tylko do połączeń z zagranicy.
    - Centrum Praw Kobiet podaje dziś telefon interwencyjny **800 107 777**.
    - Katalog w aplikacji zawiera wyłącznie numery potwierdzone na oficjalnych stronach.

---

## 1. Definicja przemocy domowej ✅

**Źródło:** ustawa z 29.07.2005 r. o przeciwdziałaniu przemocy domowej (UPPD), t.j. Dz.U. 2024 poz. 1673, zm. Dz.U. 2026 poz. 160 (tekst ujednolicony z 27.02.2026). Zmiana z 2026 r. dotyczy organizacji administracji rządowej, nie definicji.

Art. 2 ust. 1 pkt 1 UPPD (cytat):

> przemocy domowej – należy przez to rozumieć jednorazowe albo powtarzające się umyślne działanie lub zaniechanie, wykorzystujące przewagę fizyczną, psychiczną lub ekonomiczną, naruszające prawa lub dobra osobiste osoby doznającej przemocy domowej, w szczególności:
> a) narażające tę osobę na niebezpieczeństwo utraty życia, zdrowia lub mienia,
> b) naruszające jej godność, nietykalność cielesną lub wolność, w tym seksualną,
> c) powodujące szkody na jej zdrowiu fizycznym lub psychicznym, wywołujące u tej osoby cierpienie lub krzywdę,
> d) **ograniczające lub pozbawiające tę osobę dostępu do środków finansowych lub możliwości podjęcia pracy lub uzyskania samodzielności finansowej**,
> e) istotnie naruszające prywatność tej osoby lub wzbudzające u niej poczucie zagrożenia, poniżenia lub udręczenia, w tym podejmowane za pomocą środków komunikacji elektronicznej;

**Krąg osób** (art. 2 ust. 1 pkt 2 lit. a–h, streszczenie):
- małżonek, także po ustaniu lub unieważnieniu małżeństwa,
- wstępni, zstępni, rodzeństwo i ich małżonkowie,
- osoby w stosunku przysposobienia,
- osoby pozostające obecnie lub **w przeszłości** we wspólnym pożyciu,
- osoby wspólnie zamieszkujące i gospodarujące,
- osoby pozostające obecnie lub w przeszłości **w trwałej relacji uczuciowej lub fizycznej niezależnie od wspólnego zamieszkiwania** (lit. g),
- małoletni.

Osoba stosująca przemoc to osoba **pełnoletnia** (pkt 3). Małoletni świadek przemocy jest także osobą doznającą przemocy (ust. 2).

**Nowelizacja:** ustawa z 9.03.2023 r. (Dz.U. 2023 poz. 535) weszła w życie **22.06.2023 r.** (dane z API ELI Sejmu).

**Wnioski dla aplikacji**
- Formularz wpisu ma osobną kategorię „Ekonomiczna” i szybkie tagi wzięte wprost z lit. d: „ograniczanie dostępu do pieniędzy”, „uniemożliwianie podjęcia pracy”, „uniemożliwianie samodzielności finansowej”.
- Aplikacja jest też dla byłych partnerek i partnerów oraz osób w związkach bez wspólnego zamieszkania (lit. g), a nie tylko dla małżeństw.

## 2. Procedura „Niebieskie Karty” ✅

**Źródła:**
- UPPD art. 9a, 9d,
- rozporządzenie Rady Ministrów z 6.09.2023 r. w sprawie procedury „Niebieskie Karty” oraz wzorów formularzy „Niebieska Karta” (Dz.U. 2023 poz. 1870), w życie od 28.09.2023 r., obowiązujące (API ELI).

**Kluczowe przepisy**
- Art. 9d ust. 1 UPPD: interwencja w ramach procedury „nie wymaga zgody osoby doznającej przemocy domowej ani osoby stosującej przemoc domową”.
- Art. 9d ust. 4 UPPD i § 2 ust. 1 rozporządzenia: procedurę wszczyna wypełnienie formularza **NK-A** „w przypadku uzasadnionego podejrzenia stosowania przemocy domowej lub zgłoszenia dokonanego przez świadka przemocy domowej”.
- § 2 ust. 2: NK-A wypełniają **przedstawiciele podmiotów** z art. 9a ust. 11–11d UPPD. Sekcja XIV wzoru NK-A wymienia:
  - pracownika socjalnego OPS albo specjalistycznego ośrodka wsparcia,
  - policjanta, żołnierza Żandarmerii Wojskowej,
  - asystenta rodziny, nauczyciela,
  - osobę wykonującą zawód medyczny,
  - przedstawiciela gminnej komisji rozwiązywania problemów alkoholowych,
  - pedagoga, psychologa lub terapeutę.
- § 2 ust. 5: NK-A wypełnia się **w obecności** pełnoletniej osoby doznającej przemocy.
- § 6: po wypełnieniu NK-A osoba doznająca przemocy dostaje **NK-B** (informacja o prawach i pomocy).
- Terminy:
  - NK-A trafia do zespołu interdyscyplinarnego w ciągu 5 dni roboczych (§ 7),
  - stamtąd do grupy diagnostyczno-pomocowej w ciągu 3 dni roboczych,
  - pierwsze posiedzenie grupy odbywa się w ciągu 5 dni roboczych (§ 8).
- § 11: grupa z udziałem osoby doznającej przemocy wypełnia **NK-C** i opracowuje indywidualny plan pomocy. § 12: **NK-D** wypełnia się z osobą stosującą przemoc.

**Struktura formularzy, na której opiera się raport** (zał. nr 1 i 3 do rozporządzenia)
- **NK-A, sekcja IV**, formy przemocy (dokładne kategorie z wzoru):
  - przemoc fizyczna,
  - przemoc psychiczna,
  - przemoc seksualna,
  - przemoc ekonomiczna (we wzorze m.in. „niełożenie na utrzymanie osób, wobec których istnieje taki obowiązek, niezaspokajanie potrzeb materialnych, niszczenie rzeczy osobistych, demolowanie mieszkania, wynoszenie sprzętów domowych oraz ich sprzedawanie”),
  - przemoc za pomocą środków komunikacji elektronicznej,
  - inne.
- **NK-A, pozostałe sekcje:** V obrażenia, VIII broń palna, IX poczucie bezpieczeństwa, X świadkowie, XIII dodatkowe informacje.
- **NK-C, „Historia przemocy domowej”:** pierwszy akt, powtarzający się akt, najniebezpieczniejszy akt, ostatni akt.

**Wnioski dla aplikacji**
- W aplikacji i w raporcie piszemy wprost: „to nie jest formularz Niebieskiej Karty”.
- Raport układa wpisy według kategorii z sekcji IV NK-A i według czterech punktów historii z NK-C. Oznaczenia „pierwszy” i „najniebezpieczniejszy” stawia **wyłącznie użytkowniczka**. AI nigdy ich nie ustala.

**Projekt nowelizacji UD246** ✅ (fakt istnienia), ❓ (ostateczny kształt)
- Skierowany do konsultacji 24.07.2026 r. (gov.pl, Pełnomocniczka Rządu ds. Równości).
- Zapowiada m.in. uproszczenie procedury i system teleinformatyczny @NK.
- Na dziś to projekt. Nie projektujemy pod niego, a eksport (JSON + PDF) da się później dopasować.

## 3. Środki ochrony ✅

**Sąd (UPPD, tekst ujednolicony z 27.02.2026)**
- Art. 11a ust. 1: osoba doznająca przemocy może żądać, aby sąd (postępowanie nieprocesowe) zobowiązał osobę stosującą przemoc, która „czyni szczególnie uciążliwym wspólne zamieszkiwanie”, do opuszczenia wspólnie zajmowanego mieszkania i jego bezpośredniego otoczenia lub zakazał jej zbliżania się do mieszkania. Ust. 2 rozszerza to m.in. na sytuację, gdy osoba doznająca przemocy już się wyprowadziła.
- Art. 11aa: sąd może zakazać zbliżania się na określoną w metrach odległość albo kontaktowania się. Zakaz kontaktu jest możliwy także przy nękaniu „za pomocą środków komunikacji elektronicznej” (ust. 2). Ust. 4 przewiduje zakaz wstępu do szkoły lub pracy.

**Policja (ustawa o Policji, tekst ujednolicony z 16.09.2026)**
- Art. 15aa ust. 1: nakaz natychmiastowego opuszczenia wspólnie zajmowanego mieszkania i zakaz zbliżania się do niego wobec osoby stwarzającej zagrożenie dla życia lub zdrowia.
- Art. 15aaa: zakaz zbliżania się do osoby (w metrach), zakaz kontaktowania się, zakaz wstępu do szkoły lub pracy.
- Art. 15aab: środki można łączyć i są **natychmiast wykonalne**.
- Art. 15ak ust. 1: środki „tracą moc po upływie **14 dni** od dnia ich wydania, chyba że sąd udzielił zabezpieczenia, którym zostały one przedłużone”.
- Art. 15ag: policjant musi poinformować m.in. o możliwości złożenia wniosku do sądu i o „całodobowym ogólnopolskim telefonie dla osób doznających przemocy domowej”.

**Pomoc medyczna**
- Art. 3 ust. 1 pkt 5 UPPD: bezpłatna pomoc obejmuje „badania lekarskiego w celu ustalenia przyczyn i rodzaju uszkodzeń ciała związanych z użyciem przemocy domowej oraz wydania zaświadczenia lekarskiego w tym przedmiocie”.
- Wzór zaświadczenia: rozporządzenie Ministra Zdrowia z 29.08.2023 r. (Dz.U. 2023 poz. 1827), w życie od 23.09.2023 r., obowiązujące (API ELI).

**Wnioski dla aplikacji:** w ekranie „Pomoc” są krótkie opisy tych środków prostym językiem, z odesłaniem do organizacji pomocowych.

## 4. Prawo karne ✅ (przepisy) / ❓ (kwalifikacja konkretnych zachowań)

**Źródło:** Kodeks karny, tekst ujednolicony z 28.08.2026 (t.j. Dz.U. 2025 poz. 383 z późn. zm.).

- **Brak osobnego przestępstwa przemocy ekonomicznej.** Przeszukanie całego tekstu ujednoliconego nie znalazło przepisu o „przemocy ekonomicznej”. Odpowiedzialność karna zależy od tego, czy zachowanie wypełnia znamiona innego przestępstwa, a to ocenia prokurator i sąd ❓.
- **Art. 207 § 1:** „Kto znęca się fizycznie lub psychicznie nad osobą najbliższą lub nad inną osobą pozostającą w stałym lub przemijającym stosunku zależności od sprawcy, podlega karze pozbawienia wolności od 3 miesięcy do lat 5.” Przepis nie przewiduje ścigania na wniosek ani z oskarżenia prywatnego.
- **Art. 209 § 1 i 1a:** uchylanie się od alimentów określonych orzeczeniem, ugodą lub umową, gdy zaległość wynosi co najmniej 3 świadczenia okresowe. § 2: ściganie na wniosek pokrzywdzonego, organu pomocy społecznej lub organu podejmującego działania wobec dłużnika. § 3: z urzędu, gdy przyznano świadczenia rodzinne lub z funduszu alimentacyjnego.
- **Art. 190:** groźba karalna, ściganie na wniosek.
- **Art. 190a § 1:** uporczywe nękanie (od 6 miesięcy do 8 lat), ściganie na wniosek (§ 4).
- **Art. 191 § 1a:** zmuszanie przez „przemoc innego rodzaju” stosowaną uporczywie lub w sposób istotnie utrudniający korzystanie z lokalu mieszkalnego. Ściganie na wniosek (§ 3).
- **Art. 217:** naruszenie nietykalności cielesnej, oskarżenie prywatne.
- **Art. 267 § 1, 3, 5:**
  - § 1 karze bezprawne uzyskanie dostępu do informacji przez przełamanie zabezpieczeń,
  - § 3 karze tego, kto „w celu uzyskania informacji, do której nie jest uprawniony, zakłada lub posługuje się urządzeniem podsłuchowym, wizualnym albo innym urządzeniem lub oprogramowaniem”,
  - ściganie na wniosek (§ 5).
  - Znaczenie dla aplikacji: pkt 6 (nagrania). Ten sam przepis chroni też użytkowniczkę, gdy ktoś instaluje stalkerware na jej telefonie.

## 5. Prawo rodzinne a przemoc ekonomiczna ✅

**Źródło:** Kodeks rodzinny i opiekuńczy, tekst ujednolicony z 10.07.2026 (t.j. Dz.U. 2026 poz. 236).

- **Art. 27:** oboje małżonkowie mają obowiązek przyczyniać się do zaspokajania potrzeb rodziny „każdy według swych sił oraz swych możliwości zarobkowych i majątkowych”. Może to polegać także na osobistych staraniach o wychowanie dzieci i pracy w gospodarstwie domowym.
- **Art. 28 § 1:** gdy małżonek pozostający we wspólnym pożyciu nie spełnia tego obowiązku, „sąd może nakazać, ażeby wynagrodzenie za pracę albo inne należności przypadające temu małżonkowi były w całości lub w części wypłacane do rąk drugiego małżonka”. § 2: nakaz zachowuje moc mimo ustania wspólnego pożycia.
- **Art. 28¹:** jeśli prawo do mieszkania przysługuje jednemu małżonkowi, drugi może z niego korzystać w celu zaspokojenia potrzeb rodziny. Dotyczy to też przedmiotów urządzenia domowego.

**Wniosek:** wyciągi z konta, potwierdzenia przelewów i zrzuty ekranu z bankowości to praktyczne dowody dla przemocy ekonomicznej. Dlatego aplikacja ma import plików (PDF wyciągów) i zrzutów ekranu.

❓ Szczegóły spraw alimentacyjnych i zabezpieczeń majątkowych nie zostały zbadane, bo wykraczają poza zakres projektu.

## 6. Dowody: nagrania, zdjęcia, dokumenty elektroniczne

**Postępowanie karne** ✅ (Kodeks postępowania karnego, tekst ujednolicony z 17.07.2026, t.j. Dz.U. 2026 poz. 490)
- **Art. 7:** swobodna ocena dowodów („z uwzględnieniem zasad prawidłowego rozumowania oraz wskazań wiedzy i doświadczenia życiowego”).
- **Art. 168a** (obecne brzmienie, cytat): „Dowodu nie można uznać za niedopuszczalny wyłącznie na tej podstawie, że został uzyskany z naruszeniem przepisów postępowania lub za pomocą czynu zabronionego, o którym mowa w art. 1 § 1 Kodeksu karnego, chyba że dowód został uzyskany w związku z pełnieniem przez funkcjonariusza publicznego obowiązków służbowych, w wyniku: zabójstwa, umyślnego spowodowania uszczerbku na zdrowiu lub pozbawienia wolności.”
- 🟡 W 2024 r. złożono w Sejmie poselski projekt zmiany art. 168a. W tekście ujednoliconym z 17.07.2026 przepis ma nadal brzmienie podane wyżej.

**Postępowanie cywilne** ✅ (Kodeks postępowania cywilnego, tekst ujednolicony z 18.08.2026, t.j. Dz.U. 2026 poz. 468)
- **Art. 233 § 1:** sąd ocenia wiarogodność i moc dowodów według własnego przekonania.
- **Art. 243¹:** przepisy o dokumentach stosuje się do „dokumentów zawierających tekst, umożliwiających ustalenie ich wystawców”.
- **Art. 308:** dowody z innych dokumentów, „w szczególności zawierających zapis obrazu, dźwięku albo obrazu i dźwięku”, sąd przeprowadza, stosując odpowiednio przepisy o oględzinach i o dokumentach. Nagrania i zdjęcia z Teczki trafiają tu.

**Nagrywanie rozmów** 🟡 / ❓
- 🟡 **SN, postanowienie z 26.06.2025 r., I CSK 2855/24** (według omówień kancelarii; adres PDF na sn.pl zwracał 404 w dniu weryfikacji): nagrania „dokonane bez zgody i wiedzy rozmówcy po zweryfikowaniu ich autentyczności mogą być dowodem” w postępowaniu cywilnym. Ocena ma być wyważona. Okoliczności nagrania wskazujące na poważne naruszenie zasad współżycia społecznego mogą zdyskwalifikować dowód.
- 🟡 Według tych samych omówień SN w wyroku z 22.04.2016 r. (II CSK 478/15) odróżnił nagranie przez uczestnika rozmowy od materiału uzyskanego przestępczo, z odwołaniem do art. 267 kk.
- ❓ **Granica z art. 267 § 3 kk.** Przepis dotyczy informacji, „do której [sprawca] nie jest uprawniony”. Uczestniczka rozmowy jest adresatką wypowiedzi, dlatego w omówieniach przeważa pogląd, że nagranie **własnej** rozmowy nie wypełnia tego przepisu. Nagrywanie **cudzych** rozmów, np. zostawiony telefon nagrywający rozmowę sprawcy z inną osobą, może już podlegać art. 267 § 3. Aplikacja ostrzega przed tym. Do potwierdzenia przez prawnika w pilotażu.
- ❓ Odpowiedzialność cywilna za naruszenie dóbr osobistych (np. wizerunku) przy nagraniach i zdjęciach osób trzecich nie została zbadana.

**Wnioski techniczne**
- Przechowujemy **oryginalne pliki** (bajt w bajt, z metadanymi EXIF) i ich SHA-256 policzone przed szyfrowaniem.
- Każdy wpis ma znacznik czasu. Weryfikację da się powtórzyć bez aplikacji (openssl, strona `verifier/`). To odpowiada na typowy zarzut, że dowód jest „zmyślony” albo „przerobiony”.
- Wpisów nie edytujemy. Korekta to nowy wpis, a usunięcie zostawia w łańcuchu ślad z hashem. To też wzmacnia wiarygodność przy swobodnej ocenie dowodów.

## 7. Znaczniki czasu ✅

**Rozporządzenie eIDAS (UE) nr 910/2014**, tekst skonsolidowany z 18.10.2024 (EUR-Lex, wersja PL):
- **Art. 3 pkt 33:** „elektroniczny znacznik czasu” to „dane w postaci elektronicznej, które wiążą inne dane w postaci elektronicznej z określonym czasem, stanowiąc dowód na to, że te inne dane istniały w danym czasie”.
- **Art. 3 pkt 34:** kwalifikowany znacznik czasu spełnia wymogi art. 42.
- **Art. 41 ust. 1:** „Nie jest kwestionowany prawny skutek elektronicznego znacznika czasu ani jego dopuszczalność jako dowodu w postępowaniu sądowym wyłącznie z tego powodu, że znacznik ten ma postać elektroniczną lub że nie spełnia wymogów kwalifikowanego elektronicznego znacznika czasu.”
- **Art. 41 ust. 2:** „Kwalifikowany elektroniczny znacznik czasu korzysta z domniemania dokładności daty i czasu, jakie wskazuje, oraz integralności danych, z którymi wskazywane data i czas są połączone.”
- **Art. 42 ust. 1:** kwalifikowany znacznik musi:
  - wiązać datę i czas z danymi tak, „aby w wystarczający sposób wykluczyć możliwość niewykrywalnej zmiany danych”,
  - opierać się na precyzyjnym źródle czasu powiązanym z UTC,
  - być podpisany zaawansowanym podpisem lub opatrzony zaawansowaną pieczęcią **kwalifikowanego dostawcy usług zaufania**.

**Prawo krajowe:** ustawa z 5.09.2016 r. o usługach zaufania oraz identyfikacji elektronicznej (t.j. Dz.U. 2024 poz. 1725; tekst ujednolicony z 24.03.2026). eIDAS stosuje się bezpośrednio.

**Kwalifikowani dostawcy znaczników czasu w Polsce** ✅ (rejestr kwalifikowanych usług zaufania opublikowany przez NCCert, wpisy „Kwalifikowany znacznik czasu”, stan 3.10.2026):
- Unizeto Technologies S.A.,
- Polska Wytwórnia Papierów Wartościowych S.A.,
- Krajowa Izba Rozliczeniowa S.A.,
- TP Internet sp. z o.o.,
- Safe Technologies S.A.,
- Enigma Systemy Ochrony Informacji sp. z o.o.,
- Asseco Data Systems S.A.,
- Eurocert sp. z o.o.

❓ Rejestr pokazuje wpisy, ale nie aktualną ofertę handlową ani to, czy każda usługa jest nadal dostępna dla nowych klientów. Trzeba to sprawdzić u dostawców. Usługi kwalifikowane są płatne.

**Co używamy w demo** ✅
- **FreeTSA** (`https://freetsa.org/tsr`): według strony usługi nie jest kwalifikowaną usługą eIDAS. Token pobrany 3.10.2026 przeszedł `openssl ts -verify`: **Verification: OK**. Test `npm run tsa:smoke`.
- **Sectigo** (`https://timestamp.sectigo.com`): serwer zapasowy, odpowiada poprawnym tokenem RFC 3161. ❓ Nie sprawdzano, czy ta konkretna usługa ma status kwalifikowany. Zakładamy, że **nie**.

**Co znacznik dowodzi, a czego nie**
- **Dowodzi**, że dokładnie te bajty (ich SHA-256) istniały najpóźniej w czasie wskazanym przez TSA i od tamtej pory się nie zmieniły.
- **Nie dowodzi**, kiedy zdarzenie się wydarzyło, kto zrobił zdjęcie ani czy treść jest prawdziwa.
- Zdjęcie zaimportowane z galerii po tygodniu dostaje znacznik z dnia importu.

## 8. Ochrona danych (RODO)

**Rozporządzenie (UE) 2016/679**, EUR-Lex PL ✅:
- **Art. 2 ust. 2 lit. c:** RODO nie ma zastosowania do przetwarzania „przez osobę fizyczną w ramach czynności o czysto osobistym lub domowym charakterze”.
- **Art. 9 ust. 1:** zakaz przetwarzania m.in. danych „dotyczących zdrowia, seksualności”. Wyjątki są w ust. 2, m.in. lit. a (wyraźna zgoda) i lit. f (przetwarzanie niezbędne do ustalenia, dochodzenia lub obrony roszczeń).
- **Art. 10:** dane dotyczące wyroków skazujących i naruszeń prawa wolno przetwarzać tylko pod nadzorem władz publicznych albo gdy pozwala na to prawo Unii lub państwa członkowskiego.

**Jak zaprojektowano aplikację** (fakty techniczne)
- Treść Teczki zostaje na telefonie, zaszyfrowana kluczem, którego nie znamy. Twórcy aplikacji nie mają do niej dostępu.
- Bez zgody użytkowniczki z telefonu wychodzą tylko **hashe SHA-256** wpisów (do TSA). Hash nie ujawnia treści.
- Opcjonalne AI wysyła wybrane opisy, po zamianie znanych imion na role, do serwera-proxy, a stamtąd do API Anthropic. Wymaga zgody przy każdym użyciu.

**Anthropic API** ✅ (Privacy Center, stan 3.10.2026)
- „we automatically delete inputs and outputs on our backend within 30 days of receipt or generation”. Wyjątki: umowa (np. zero data retention), egzekwowanie Usage Policy (do 2 lat przy oflagowaniu), obowiązek prawny.
- „By default, we will not use your inputs or outputs from our commercial products (e.g. … Anthropic API …) to train our models.”

❓ **Do konsultacji z IOD lub prawnikiem przed pilotażem:**
- Czy samo przechowywanie w Teczce mieści się w wyjątku z art. 2 ust. 2 lit. c (dane osoby stosującej przemoc i świadków). Wysłanie raportu organizacji lub organom może już wykraczać poza „czysto osobisty” charakter.
- Kto jest administratorem danych przy funkcji AI: operator serwera-proxy (zespół, organizacja partnerska)? Potrzebne są: podstawa z art. 9 ust. 2 (wyraźna zgoda), umowa powierzenia z Anthropic, ocena transferu poza EOG i najpewniej DPIA (art. 35).
- Czy hash wpisu wysyłany do TSA to dane osobowe. Zakładamy, że ryzyko jest minimalne, ale tego nie wiem.

## 9. Sklepy z aplikacjami ✅ (polityki) / ❓ (czy Teczka przejdzie weryfikację)

- **Apple App Review Guidelines 2.3.1(a)** (ostatnia aktualizacja 8.06.2026): „Don't include any hidden, dormant, or undocumented features in your app; your app's functionality should be clear to end users and App Review. All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect…”
- **Google Play, Deceptive Behavior / Behavior Transparency:**
  - „Google Play prohibits apps from containing any hidden, dormant, or undocumented features. Your app's functionality should be reasonably clear to your users.”
  - W „Key Considerations”: „Ensure your app's title, icon and description accurately reflect its actual functionality” oraz „Don't impersonate other apps, brands, or government entities.”

**Wnioski**
- Na hackathon i pilotaż wystarczy dystrybucja poza sklepami: build deweloperski, a na Androidzie APK przekazany przez organizację partnerską.
- ❓ Przy publikacji w sklepach trzeba **jawnie** opisać funkcję sejfu i przykrywek w opisie aplikacji i w notatkach dla recenzentów. Przełączanie ikony i nazwy na „Kalkulator” itp. może zostać uznane za sprzeczne z zasadą zgodności tytułu i ikony z funkcją. Nie wiem, jak zdecydują recenzenci. Trzeba o to zapytać przed publikacją.
- Jawny opis w sklepie to też ślad, który może zobaczyć sprawca, np. w historii zakupów. To kompromis do omówienia z organizacjami pomocowymi.
- Nazwy przykrywek są generyczne („Kalkulator”, „Latarka”) i nie podszywają się pod konkretną markę ani aplikację.

## 10. Katalog pomocy (to, co trafia do aplikacji)

| Kontakt | Dane | Godziny | Źródło | Status |
|---|---|---|---|---|
| Numer alarmowy | **112** | całodobowo | NK-B (Dz.U. 2023 poz. 1870) | ✅ |
| Niebieska Linia (Ogólnopolskie Pogotowie dla Osób Doznających Przemocy Domowej) | **800 120 002**; niebieskalinia@niebieskalinia.info; WhatsApp 510 404 333 | całodobowo, bezpłatnie | niebieskalinia.info | ✅ |
| Linia Pomocy Pokrzywdzonym (operator: Fundacja Iwo-Doradztwo Obywatelskie) | **116 006**; z zagranicy +48 222 309 900 | całodobowo, 7 dni w tygodniu | gov.pl (Ministerstwo Sprawiedliwości) | ✅ |
| Kryzysowy Telefon Zaufania (dorośli w kryzysie emocjonalnym) | **116 123**; czat 116sos.pl | całodobowo, bezpłatnie | policja.pl | ✅ |
| Centrum Praw Kobiet, telefon interwencyjny | **800 107 777** (po połączeniu wybrać 9); dyżur prawny ten sam numer, wewn. 7; pomoc@cpk.org.pl | interwencyjny całodobowo; prawny we wtorki 17:00–20:30 | cpk.org.pl | ✅ |
| Policyjny telefon zaufania | 800 120 226 | NK-B (2023): „codziennie 9:30–15:30”; strony gmin: „pn–pt 9:30–15:30” | NK-B, strony samorządów | 🟡 **nie wpisano do aplikacji** |

Uwagi:
- Numer 600 070 717, który wyszukiwarki podają dla Centrum Praw Kobiet, **nie występuje** na stronie cpk.org.pl (stan 3.10.2026), dlatego go pominięto.
- Połączenie pojawi się w historii połączeń telefonu. Aplikacja o tym przypomina.

## 11. Otwarte pytania (do prawniczki lub prawnika i organizacji pomocowej)

1. Czy chronologia z Teczki (PDF i pakiet ZIP) jest przydatna dla zespołów interdyscyplinarnych i grup diagnostyczno-pomocowych? W jakiej formie najlepiej ją przekazywać?
2. Czy w sprawach z art. 207 kk prokuratura akceptuje pakiet z niekwalifikowanym znacznikiem czasu, czy potrzebny jest kwalifikowany? Jakie są koszty?
3. Granica art. 267 § 3 kk przy nagraniach w domu, np. nagranie kłótni, w której uczestniczą dzieci.
4. Status RODO przechowywania danych sprawcy i świadków w Teczce oraz wysyłki raportu organizacji.
5. Model administratora danych, umowa powierzenia, DPIA dla funkcji AI.
6. Strategia dystrybucji (sklepy a sideload) w świetle polityk Apple i Google.
7. Czy projekt UD246 zmieni NK-A w sposób, który wymaga zmiany raportu.

## 12. Źródła

- UPPD, t.j. Dz.U. 2024 poz. 1673: https://api.sejm.gov.pl/eli/acts/DU/2024/1673/text.pdf, tekst ujednolicony: https://api.sejm.gov.pl/eli/acts/DU/2005/1493/text/U/D20051493Lj.pdf
- Nowelizacja z 9.03.2023 (Dz.U. 2023 poz. 535): https://api.sejm.gov.pl/eli/acts/DU/2023/535
- Rozporządzenie RM w sprawie procedury „Niebieskie Karty” (Dz.U. 2023 poz. 1870): https://api.sejm.gov.pl/eli/acts/DU/2023/1870/text.pdf
- Rozporządzenie MZ, wzór zaświadczenia lekarskiego (Dz.U. 2023 poz. 1827): https://api.sejm.gov.pl/eli/acts/DU/2023/1827
- Kodeks karny (tekst ujednolicony): https://api.sejm.gov.pl/eli/acts/DU/1997/553/text/U/D19970553Lj.pdf
- Kodeks postępowania karnego: https://api.sejm.gov.pl/eli/acts/DU/1997/555/text/U/D19970555Lj.pdf
- Kodeks postępowania cywilnego: https://api.sejm.gov.pl/eli/acts/DU/1964/296/text/U/D19640296Lj.pdf
- Kodeks rodzinny i opiekuńczy: https://api.sejm.gov.pl/eli/acts/DU/1964/59/text/U/D19640059Lj.pdf
- Ustawa o Policji: https://api.sejm.gov.pl/eli/acts/DU/1990/179/text/U/D19900179Lj.pdf
- Ustawa o usługach zaufania: https://api.sejm.gov.pl/eli/acts/DU/2016/1579/text/U/D20161579Lj.pdf
- eIDAS, tekst skonsolidowany PL: https://eur-lex.europa.eu/legal-content/PL/TXT/HTML/?uri=CELEX:02014R0910-20241018
- RODO PL: https://eur-lex.europa.eu/legal-content/PL/TXT/HTML/?uri=CELEX:32016R0679
- Rejestr NCCert, usługi kwalifikowane: https://www.nccert.pl/uslugi_tabela_1k.html
- FreeTSA: https://freetsa.org/index_en.php
- Projekt UD246: https://www.gov.pl/web/rownosc/ruszyly-konsultacje-nowelizacji-ustawy-o-przeciwdzialaniu-przemocy-domowej
- SN I CSK 2855/24 (omówienie): https://pz.legal/czy-nagranie-dokonane-bez-zgody-i-wiedzy-rozmowcy-moze-stanowic-dowod-w-postepowaniu-cywilnym/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play, Deceptive Behavior: https://support.google.com/googleplay/android-developer/answer/9888077
- Anthropic, retencja danych: https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- Anthropic, trenowanie modeli: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- Niebieska Linia: https://niebieskalinia.info/
- Linia Pomocy Pokrzywdzonym: https://www.gov.pl/web/sprawiedliwosc/linia-pomocy-pokrzywdzonym
- 116 123: https://policja.pl/pol/telefony-zaufania/2852,Potrzebujesz-wsparcia-Wazne-telefony.html
- Centrum Praw Kobiet: https://cpk.org.pl/pomoc/pomoc-telefoniczna/
