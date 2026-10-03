# Przekazanie sesji (stan: 3.10.2026)

Dokument dla kolejnej sesji/modelu. Najpierw przeczytaj ten plik, potem `README.md`.

## Projekt w skrócie

**Teczka** (na telefonie „Przybornik”): aplikacja Expo / React Native (SDK 57, RN 0.86, expo-router) na HackYeah 2026, kategoria **ImpactHer: Technology for Real Change**. Zakamuflowany, zaszyfrowany sejf na dowody przemocy domowej (także ekonomicznej). Przykrywka = zwykła aplikacja; sejf otwiera czynność-klucz wybrana przez użytkowniczkę. Wpisy: łańcuch SHA-256 + znaczniki czasu RFC 3161 (FreeTSA), raport PDF, pakiet ZIP weryfikowalny bez aplikacji (`verifier/`).

- Repo: `C:\Informatyka\SEM7\HACKYEAH\teczka`, GitHub `Mikformatycy/womens-kit`, gałąź `main`.
- Kopia stanu sprzed pierwszych zmian: `C:\Informatyka\SEM7\HACKYEAH\teczka_old.zip`.
- Dokumentacja: `docs/architektura.md`, `docs/model-zagrozen.md`, `docs/research-prawny.md`, `docs/pitch-i-demo.md`.

## Użytkowniczka: jak pracować

- Pisze po polsku, krótko. Odpowiadaj po polsku, zwięźle.
- **Nie commituj i nie pushuj** (sama to robi). Komendy podawaj w osobnych blokach.
- **Interfejs: minimum tekstu**, klasycznie, ikony zamiast napisów (✕, +, aparat…), objaśnienia za ikonką ⓘ (`Info` w `src/ui/kit.tsx`). Nie lubi „AI slop”, długich akapitów ani raportów-ścian tekstu.
- Szybkość ważniejsza niż efekty.
- AI ma być **prawdziwym modelem LLM** (nie reguły if-else), ale **darmowym** i bez serwera → wybrała Google Gemini.
- Termin zgłoszenia: 4.10, 23:00. Kwestię daty startu z regulaminu uznała za „ok”, nie wracaj do niej.

## Uruchamianie

- **iPhone 13 przez Expo Go** (główny sposób testowania). Terminal w folderze `teczka`:
  `$env:REACT_NATIVE_PACKAGER_HOSTNAME = "10.250.166.136"; npx expo start --lan --clear`
  (IP Wi-Fi laptopa; po zmianie sieci sprawdzić `ipconfig`). Zmiany w kodzie wczytują się same; `r` = reload. Po przeładowaniu sejf trzeba otworzyć kluczem od nowa.
- Wszystkie `npx expo …` uruchamiać **w folderze projektu** (w `C:\Users\karag` npx pobiera uszkodzone Expo).
- **Android release** (emulator Pixel_8): `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64` z `JAVA_HOME=C:\Users\karag\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2` (JDK 25 z Android Studio psuje build). `android/local.properties` musi mieć `cmake.dir=.../Sdk/cmake/4.1.2` (inaczej błąd długich ścieżek). Pełny build po `expo prebuild` trwa ~20 min. Ostatni zbudowany APK **nie zawiera** najnowszych zmian JS (ekran prawny, Gemini, suwak, raport-tabela).
- Emulator ma 2 GB RAM w konfiguracji i się dławi; uruchamiać z `-memory 4096`. Laptop ma 16 GB i przy Gradle + emulatorze brakuje pamięci (zamknąć Gradle: `./gradlew --stop`).
- Testy/jakość: `npx jest` (87 przechodzi, 2 sieciowe pominięte), `npx tsc --noEmit`, `npx eslint .`.
- Pułapki: ekrany sejfu mają `FLAG_SECURE` (zrzuty ekranu czarne); w Git Bash `/sdcard` jest przerabiane (`MSYS_NO_PATHCONV=1`); panel terminala w aplikacji Claude nie startuje (zepsuta integracja), więc długie procesy przez Bash w tle.

## AI (Gemini, bez serwera)

- `src/ai/gemini.ts` – `generateContent` z `responseJsonSchema`, nagłówek `x-goog-api-key`.
- `src/ai/config.ts` – klucz/model z `.env.local`: `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_GEMINI_MODEL` (domyślnie `gemini-3.8-flash`; przy 503/429 jedno ponowienie na `EXPO_PUBLIC_GEMINI_FALLBACK_MODEL`, domyślnie `gemini-3.5-flash`; `gemini-2.5-flash` niedostępny dla nowych kont). Szablon: `.env.example`. `.env.local` jest w `.gitignore`.
- `src/ai/prompts.ts` – instrukcje i schematy: ocena powagi (`ASSESS_*`) i porządkowanie opisów (`ORGANIZE_*`).
- Klucz jest w `.env.local` (w `.gitignore`). Sprawdzone 3.10 z Node: ocena i porządkowanie działają, 3.8-flash bywa przeciążony (503). Test klucza: `npm run gemini:smoke [-- inny-model]`. Po zmianie `.env.local` restart Expo z `--clear`. Na iPhonie jeszcze niesprawdzone.
- Bezpiecznik: `src/legal/assessment.ts` łączy ocenę modelu z regułami `src/legal/severity.ts`; model nie może dać niższego poziomu niż twarde sygnały (duszenie, groźba zabicia, broń, przemoc seksualna → poziom 3).
- Darmowy Gemini: Google może używać treści do ulepszania usług – napisane w zgodzie w aplikacji i w README. Stary proxy z Claude został w `server/` (nieużywany).

## Co zostało zrobione w tej sesji (najważniejsze)

- Wydajność: szybkie base64/UTF-8, scrypt `asyncTick: 100` (odblokowanie ~0,65 s zamiast ~16 s w starym buildzie), zdjęcia z pliku tymczasowego, TSA bez długich timeoutów offline (10 s, wspólne żądanie, stop po pierwszej porażce).
- Błędy: kolejka zapisów indeksu, klucz z zerami przy zmianie klucza/zapisie, auto-blokada przy pisaniu/nagrywaniu/AI (`markActivity`, `holdOpen`), jawne kopie w cache, walidacja dat, plural, ustawienia zapisywane przy wyjściu.
- Szkic wpisu szyfrowany (`draft.enc`), przetrwa szybkie wyjście; szybkie zdjęcie/nagranie z ekranu głównego.
- Przykrywki: **Przepisy, Zadania, Pij wodę, Urodziny, Czytelniczka, Moje kwiatki** (kalkulator/minutnik/latarka usunięte). Ikony gradientowe z `assets/covers/src/*.svg` → `npm run icons`. Klucze-sekwencje mają **stałą długość** (5 kroków, rytm 6).
- UI: ikony (Ionicons z `@expo/vector-icons`), FAB „+”, chipy, ⓘ-dymki, suwak auto-blokady 1–15 min (`Slider` w kit), mniej tekstu wszędzie.
- „Ocena i prawo” (`app/sejf/prawo.tsx`): ocena powagi z Gemini (przycisk) + offline podpowiedzi prawne z zamkniętej listy przepisów (`src/legal/rules.ts`, tylko pozycje ✅ z researchu; test pilnuje, że każdy cytowany artykuł jest w `docs/research-prawny.md`).
- Raport PDF (`src/report/html.ts`): minimalistyczny – jedna tabela (Nr, Data, Rodzaj, Opis bez zmian, Szczegóły, Znacznik czasu). Pola relacja/broń/dzieci pytane w okienku dopiero przy generowaniu PDF/ZIP (nie w ustawieniach). Usunięty „łańcuch” z ekranu raportu.
- Metryki pilotażu w `manifest.json` pakietu (`src/report/metrics.ts`), przypomnienie o kopii na ekranie głównym.

## Otwarte / do zrobienia

1. **Moduł „Pieniądze”** (U6) – zrobiony 3.10: `content.money` (rodzaj + kwota w groszach) w zwykłym wpisie, lista pod formą „Ekonomiczna" w `app/sejf/nowy.tsx` (tylko przez „+”, bez osobnego przycisku), tabela sum w raporcie (`moneySummary`, korekta zastępuje poprawiany wpis), testy `src/__tests__/money.test.ts`. Do sprawdzenia na iPhonie. Otwarte: pole „za jaki miesiąc”, kwota w zapytaniu do AI.
2. **Licznik 14 dni** po nakazie policji (U3), **„Bezpieczeństwo finansowe”** w Pomocy (U7: PESEL, BIK), **nieodpłatna pomoc prawna** w Pomocy – rekomendowane, nie zaczęte.
3. Nowe pliki od użytkowniczki w `C:\Users\karag\Downloads\`: `research-prawny.md` (uzupełnienie 3.10, +125 linii) i `scenariusze-i-ulepszenia.md` – zaproponowano skopiowanie do `docs/` (podmiana researchu), czeka na zgodę.
4. **Materiały do zgłoszenia** (użytkowniczka: „potem się zajmiemy”): PDF maks. 10 slajdów, nazwa zespołu i skład, ujednolicona nazwa projektu (Teczka vs repo womens-kit), tryb demo bez FLAG_SECURE do zrzutów, nagranie demo, liczby o skali problemu (policja.pl), odświeżenie `docs/pitch-i-demo.md` (krok 8 mówi o usuniętym Kalkulatorze) i tabeli „Stan projektu” w README.
5. Nowy build Androida z najnowszym JS i sprawdzenie na urządzeniu (ekran prawny, suwak, okienko raportu, Gemini).
