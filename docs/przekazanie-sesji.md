# Przekazanie sesji (stan: 4.10.2026)

Dokument dla kolejnej osoby lub sesji. Najpierw ten plik, potem `README.md`.

## Projekt w skrócie

**sejf-place** (na iPhonie pod ikoną „Pocket”, na Androidzie nazwa przykrywki; dawniej „Teczka”): aplikacja Expo / React Native (SDK 57, expo-router) na HackYeah 2026, **ImpactHer: Technology for Real Change**. Zakamuflowany, zaszyfrowany sejf na dowody przemocy domowej, także ekonomicznej. Przykrywka to zwykła aplikacja; sejf otwiera czynność-klucz wybrana przez użytkowniczkę. Wpisy: łańcuch SHA-256 + znaczniki czasu RFC 3161 (FreeTSA), raport PDF, pakiet ZIP weryfikowalny bez aplikacji (`verifier/`).

- Repozytorium: GitHub `Mikformatycy/sejf-space`, gałąź `main`. Pakiet aplikacji nadal `pl.przybornik.app` (zmiana zrobiłaby z tego nową aplikację).
- Zespół: Jan Bancerewicz, Piotr Uszyński, Maciej Rapicki, Franciszek Fabiński, Karolina Glaza.
- Dokumentacja: `docs/architektura.md`, `docs/model-zagrozen.md`, `docs/research-prawny.md`, `docs/pitch-i-demo.md`.

## Jak pracować z zespołem

- Po polsku, krótko. Commity i push robi zespół.
- Interfejs: mało tekstu, ikony zamiast napisów, objaśnienia pod ⓘ (`Info` w `src/ui/kit.tsx`), dłuższe wyjaśnienia w Pomocy (FAQ, `src/content/pomoc.ts`).
- Szybkość ważniejsza niż efekty; animacje tylko na transformacjach i przezroczystości.

## Uruchamianie

- **iPhone przez Expo Go** (główny sposób testowania), w folderze projektu:
  `$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<IP laptopa>"; npx expo start --lan --clear`
  Po zmianie `.env.local` albo po instalacji nowej paczki trzeba zrestartować Expo z `--clear`.
- **Android release** (emulator Pixel_8): `cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64` z `JAVA_HOME` = JDK 17 (`~/.gradle/jdks/eclipse_adoptium-17-amd64-windows.2`). Emulator z danymi testowymi uruchamiać z `-read-only`.
- Jakość: `npx tsc --noEmit`, `npx expo lint`, `npx jest`.

## Najważniejsze miejsca w kodzie

- Sejf: `app/sejf/(tabs)/` (zakładki: telefony, wpisy, pomoc, ustawienia + wspólna belka `src/ui/BottomBar.tsx`), `app/sejf/nowy.tsx` (nowy wpis / edycja), `app/sejf/wpis/[id].tsx` (widok wpisu: prawo, głos rozsądku, uporządkuj, historia wersji), `app/sejf/raport.tsx` (eksport).
- Przykrywki: `src/covers/ui/*Cover.tsx` (+ `decor.tsx`: nagłówki i tła), instrukcje kluczy w `src/covers/catalog.ts`.
- AI: `src/ai/` (Gemini prosto z telefonu, modele `gemini-3.5-flash` / `-lite`), bezpiecznik ocen `src/legal/assessment.ts` + `severity.ts`.
- Motyw: `src/ui/theme.ts` (jasny/ciemny, kolory rodzajów przemocy w `src/ui/formColors.ts`), logo: czcionka Lexend, `OutlineText` w `src/ui/kit.tsx`, animacja `src/ui/UnlockIntro.tsx`.

## Tryb demo (przywrócić przed prawdziwym użyciem!)

- **Blokada zrzutów ekranu wyłączona**: zakomentowane `usePreventScreenCapture` w `src/vault/quickExit.ts` (oznaczone `DEMO`).
- Klucz Gemini wbudowany w aplikację z `.env.local`; w produkcji potrzebny serwer pośredni.

## Otwarte

1. Materiały do zgłoszenia (termin 4.10, 23:00, HackTribe): PDF maks. 10 slajdów, nazwa zespołu, zrzuty ekranu, ewentualnie APK i weryfikator jako demo link.
2. Liczby o skali problemu ze źródłem (np. statystyki Policji o procedurze „Niebieskie Karty”) do prezentacji.
3. Przyciski głośności w przykrywce (ukryte zdjęcie przód/tył i nagranie z autozapisem): realne tylko w zbudowanej aplikacji na Androida, wymaga „skrzynki” szyfrowanej kluczem publicznym, bo przy zamkniętym sejfie nie ma klucza. Na razie jako następny krok w pitchu.
4. Rekomendowane, nie zaczęte: licznik 14 dni po nakazie policji, „Bezpieczeństwo finansowe” w Pomocy (PESEL, BIK).
5. Pliki demo weryfikatora nadal nazywają się `teczka-demo*.zip`.
