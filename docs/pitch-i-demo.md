# Pitch i scenariusz demo

## Problem (1 zdanie)

Od 22.06.2023 r. polskie prawo wprost uznaje przemoc ekonomiczną za przemoc domową, ale osobom jej doznającym trudno ją **udokumentować**. Dowody giną, są podważane jako „zmyślone” albo „przerobione”, a telefon często kontroluje sprawca.

## Rozwiązanie

sejf-place wygląda jak zwykła aplikacja (przepisy, zadania, pij wodę, urodziny, czytelniczka, kwiatki). Sejf otwiera czynność, którą wybrała sama użytkowniczka, np. zmiana ilości twarogu w serniku na jej liczbę. W środku:
- zaszyfrowane wpisy, zdjęcia i nagrania,
- łańcuch sum kontrolnych i znaczniki czasu RFC 3161,
- „Co mówi prawo” (offline) i głos rozsądku (AI, na żądanie),
- raport PDF i pakiet ZIP, który każdy sprawdzi bez naszej aplikacji.

## Magic moment (scenariusz demo, ok. 3 min)

1. **Ekran telefonu:** ikona „Przepisy”. Otwieramy: kolorowy nagłówek, wyszukiwarka, sernik. Zwykła książka kucharska.
2. **Klucz:** w serniku ołówek przy „Składniki” → twaróg `1250` → ✓. Otwiera się sejf, a nazwa sejf-place wlatuje na swoje miejsce w nagłówku. (Wracając później do przepisu pokazujemy, że twaróg nadal ma 1000 g: klucz się nie zapisał.)
3. **Lista wpisów:** każdy wpis to karta z miniaturami zdjęć, długością nagrań, kwotą i kolorowymi ikonami rodzaju przemocy. Na dole stałe menu: telefony, wpisy, duży plus, pomoc, ustawienia.
4. **Plus → nowy wpis:**
   - data i godzina z systemowego wybieraka,
   - opis („Zabrał mi kartę do wspólnego konta…”),
   - „Ekonomiczna” → „odmowa pieniędzy” + kwota 200 zł,
   - zdjęcie z aparatu w sejfie (w galerii go nie ma),
   - **Zapisz**.
5. **Widok wpisu:**
   - przy dacie pojawia się tarcza: znacznik czasu z FreeTSA,
   - **głos rozsądku** (fioletowe koło na dole) → ocena w kolorowej ramce, od pomarańczowej do ciemnoczerwonej,
   - **Prawo** → pasujące przepisy, rozwijane pod znacznikiem czasu,
   - **Uporządkuj** → poprawiona pisownia; przełącznik „Mój opis / Wersja AI”, oryginał się nie zmienia.
6. **Eksport** (ikonka przy „WPISY”) → podgląd raportu → **Udostępnij raport PDF** albo **Paczka dowodów (ZIP)**. Przeciągamy ZIP na stronę `verifier/`: wszystko zielone, podpis TSA potwierdzony kryptograficznie.
7. Przeciągamy **`teczka-demo-zmieniony.zip`**, w którym zmieniono jedno słowo („krzyczał” → „mówił”). Weryfikator od razu wskazuje zmieniony wpis: ✗.
8. **✕** (albo potrząśnięcie telefonem): ekran znów pokazuje **przepis na sernik**.
9. (Opcjonalnie) **Ustawienia → Przykrywka**: wybór ikonką, np. „Moje kwiatki”, i nowy klucz z listy. Po wyjściu ikona i nazwa w launcherze Androida się zmieniają. Tryb ciemny w sejfie.

Plan B bez telefonu: kroki 6–7 działają w przeglądarce (`npm run verifier`, pakiety w `verifier/demo/`).

## Dlaczego to działa prawnie (z researchu, ze źródłami)

- Definicja przemocy ekonomicznej to art. 2 ust. 1 pkt 1 lit. d ustawy o przeciwdziałaniu przemocy domowej.
- Raport **nie udaje** Niebieskiej Karty: NK-A wypełnia służba (§ 2 rozporządzenia). Raport ułatwia tę rozmowę.
- Znacznik czasu: eIDAS art. 41 ust. 1 mówi, że nie można go odrzucić tylko dlatego, że jest elektroniczny. Wersja produkcyjna może użyć kwalifikowanego TSA (art. 41 ust. 2, domniemanie).
- Mówimy uczciwie, czego znacznik **nie** dowodzi: czasu zdarzenia ani prawdziwości treści.

## Mierzalna zmiana (pilotaż)

**Bez telemetrii w aplikacji**, bo to byłby ślad i ryzyko. Pomiar przez organizację partnerską, anonimowo, za zgodą:
- czas od pierwszego zapisanego zdarzenia do zgłoszenia (Niebieska Karta / zawiadomienie),
- odsetek spraw, w których dowody z sejf-place zostały przyjęte przez zespół interdyscyplinarny, policję lub sąd,
- odsetek pakietów, które przeszły weryfikację bez zastrzeżeń,
- jakościowo: czy raport skrócił rozmowę przy NK-A (ankieta dla pracowników socjalnych).

**Szukamy partnera do pilotażu:** organizacji pomocowej albo ośrodka interwencji kryzysowej.

## Etyka

- Projektowane pod konkretny model zagrożeń (`docs/model-zagrozen.md`): sprawca z dostępem do telefonu.
- Mówimy wprost, czego aplikacja nie potrafi (stalkerware, kopie zapasowe, komunikat iOS).
- AI jest opcjonalne i działa tylko po naciśnięciu przycisku AI, z pseudonimizacją imion. Ocena nie może zaniżyć twardych sygnałów zagrożenia (reguły w `src/legal/severity.ts`). „Uporządkuj” nie zmienia oryginału, a wersja z nową liczbą (datą, kwotą) jest odrzucana.
- Następny krok: konsultacja projektu z organizacjami pomocowymi i prawnikami (lista pytań: `docs/research-prawny.md`, pkt 11).

## Co jest gotowe, a co nie

Zobacz „Ograniczenia” w README. Następne kroki: przyciski głośności w przykrywce (ukryte zdjęcie lub nagranie zapisywane do „skrzynki” sejfu), kwalifikowany TSA, serwer pośredni dla AI, pilotaż z organizacją pomocową.
