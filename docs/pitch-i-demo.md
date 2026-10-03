# Pitch i scenariusz demo

## Problem (1 zdanie)

Od 22.06.2023 r. polskie prawo wprost uznaje przemoc ekonomiczną za przemoc domową, ale osobom jej doznającym trudno ją **udokumentować**. Dowody giną, są podważane jako „zmyślone” albo „przerobione”, a telefon często kontroluje sprawca.

## Rozwiązanie

Teczka wygląda jak zwykła aplikacja (przepisy, kalendarz urodzin, podlewanie kwiatków…). Sejf otwiera czynność, którą wybrała sama użytkowniczka, np. zmiana ilości twarogu w serniku na jej liczbę. W środku:
- zaszyfrowane dowody,
- łańcuch sum kontrolnych i znaczniki czasu RFC 3161,
- raport ułożony według kategorii formularza „Niebieska Karta”,
- pakiet, który każdy sprawdzi bez naszej aplikacji.

## Magic moment (scenariusz demo, ok. 3 min, emulator Androida)

1. **Ekran główny telefonu:** ikona „Przepisy”. Otwieramy: sernik, składniki, kroki. Zwykła książka kucharska.
2. „Zmieniam ilość twarogu na…” → **Edytuj ilości** → twaróg `1250` → **Zapisz**. Otwiera się Teczka. (Pokazujemy, że w przepisie nadal jest 1000 g, bo klucz się nie zapisał.)
3. **+ Nowy wpis**:
   - data,
   - forma „Ekonomiczna”, tag „ograniczanie dostępu do pieniędzy”,
   - opis: „Zabrał mi kartę do wspólnego konta…”,
   - 📷 zdjęcie z aparatu w Teczce (w galerii go nie ma),
   - **Zapisz**.
4. We wpisie pojawia się **🔒 znacznik czasu** z FreeTSA, z godziną i wystawcą.
5. **Raport → Pakiet dowodów (ZIP)**. Przeciągamy plik na stronę `verifier/`: wszystko zielone, a podpis TSA potwierdzony kryptograficznie.
6. Przeciągamy **`teczka-demo-zmieniony.zip`**, w którym zmieniono jedno słowo („krzyczał” → „mówił”). Weryfikator od razu wskazuje wpis nr 2: ✗.
7. W aplikacji: **✕ Wyjdź** (albo potrząśnięcie). Ekran znów pokazuje **przepis na sernik**.
8. (Opcjonalnie) **Ustawienia → Zmień przykrywkę** → Kalkulator → klucz `19+84=`. Po wyjściu ikona i nazwa w launcherze zmieniają się na „Kalkulator”.

Plan B bez emulatora: kroki 5–6 działają w przeglądarce (`npm run verifier`, pakiety w `verifier/demo/`).

## Dlaczego to działa prawnie (z researchu, ze źródłami)

- Definicja przemocy ekonomicznej to art. 2 ust. 1 pkt 1 lit. d ustawy o przeciwdziałaniu przemocy domowej.
- Raport **nie udaje** Niebieskiej Karty: NK-A wypełnia służba (§ 2 rozporządzenia). Raport ułatwia tę rozmowę.
- Znacznik czasu: eIDAS art. 41 ust. 1 mówi, że nie można go odrzucić tylko dlatego, że jest elektroniczny. Wersja produkcyjna może użyć kwalifikowanego TSA (art. 41 ust. 2, domniemanie).
- Mówimy uczciwie, czego znacznik **nie** dowodzi: czasu zdarzenia ani prawdziwości treści.

## Mierzalna zmiana (pilotaż)

**Bez telemetrii w aplikacji**, bo to byłby ślad i ryzyko. Pomiar przez organizację partnerską, anonimowo, za zgodą:
- czas od pierwszego zapisanego zdarzenia do zgłoszenia (Niebieska Karta / zawiadomienie),
- odsetek spraw, w których dowody z Teczki zostały przyjęte przez zespół interdyscyplinarny, policję lub sąd,
- odsetek pakietów, które przeszły weryfikację bez zastrzeżeń,
- jakościowo: czy raport skrócił rozmowę przy NK-A (ankieta dla pracowników socjalnych).

**Szukamy partnera do pilotażu:** organizacji pomocowej albo ośrodka interwencji kryzysowej.

## Etyka

- Projektowane pod konkretny model zagrożeń (`docs/model-zagrozen.md`): sprawca z dostępem do telefonu.
- Mówimy wprost, czego aplikacja nie potrafi (stalkerware, kopie zapasowe, komunikat iOS).
- AI jest opcjonalne, za zgodą przy każdym użyciu, z pseudonimizacją i zatwierdzaniem zdanie po zdaniu. Oryginały zawsze mają pierwszeństwo.
- Następny krok: konsultacja projektu z organizacjami pomocowymi i prawnikami (lista pytań: `docs/research-prawny.md`, pkt 11).

## Co jest gotowe, a co nie

Zobacz tabelę „Stan projektu” w README.
