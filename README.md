# sejf-place

_Na telefonie: „Pocket” (iPhone) albo nazwa wybranej przykrywki (Android)._

**Dowody, których sprawca nie znajdzie, nie usunie i nie podważy.**

HackYeah 2026 · zadanie **ImpactHer: Technology for Real Change**

## Problem

Od 22 czerwca 2023 r. polska ustawa o przeciwdziałaniu przemocy domowej wprost obejmuje przemoc ekonomiczną (art. 2 ust. 1 pkt 1 lit. d). Taką przemoc trudno jednak udowodnić:
- sprawca często kontroluje telefon: przegląda galerię, wiadomości i listę aplikacji,
- dowody giną albo są podważane jako „zmyślone” lub „przerobione”,
- przy zgłoszeniu (procedura „Niebieskie Karty”) liczą się daty, powtarzalność i szczegóły, których po czasie nikt nie pamięta.

## Rozwiązanie

sejf-place wygląda jak zwykła aplikacja i naprawdę nią jest: przepisy, lista zadań, pij wodę, urodziny, czytelniczka albo kwiatki. Sejf otwiera tylko **czynność wybrana przez użytkowniczkę**, np. zmiana ilości twarogu w serniku na 1250 g. Nic w interfejsie nie zdradza, że sejf istnieje.

W sejfie:
- **wpisy** z datą, opisem, rodzajem przemocy (kategorie z formularza Niebieskiej Karty) i kwotami przy przemocy ekonomicznej,
- **zdjęcia, nagrania i pliki**, zaszyfrowane i nigdy niezapisywane w galerii,
- **znacznik czasu RFC 3161** i łańcuch sum kontrolnych SHA-256 dla każdego wpisu; edycja tworzy nową wersję, a stara zostaje w historii,
- **eksport**: raport PDF do rozmowy z policją lub pracownikiem socjalnym oraz pakiet ZIP z dowodami, który każdy sprawdzi bez aplikacji (`verifier/`, działa w przeglądarce),
- **„Co mówi prawo”**: offline, sprawdzone przepisy pasujące do opisu,
- **głos rozsądku (AI, opcjonalnie)**: ocena, jak poważne jest zdarzenie, z twardymi regułami bezpieczeństwa (duszenie, groźba zabicia czy broń zawsze dają najwyższy poziom), oraz porządkowanie opisu (poprawa pisowni bez dopisywania faktów),
- **bezpieczeństwo**: szybkie wyjście (✕, potrząśnięcie), automatyczna blokada, telefony pomocowe zawsze pod ręką.

## Jak to działa (w skrócie)

- Klucz = czynność w przykrywce → `scrypt` + klucz urządzenia (Keystore/Keychain) → odpakowanie klucza głównego. Dane: AES-256-GCM.
- Z telefonu bez zgody wychodzą tylko skróty SHA-256 (do serwera znaczników czasu). Opis trafia do AI wyłącznie po naciśnięciu przycisku AI, z imionami zamienionymi na [osoba A].
- Szczegóły: [docs/architektura.md](docs/architektura.md), [docs/model-zagrozen.md](docs/model-zagrozen.md), [docs/research-prawny.md](docs/research-prawny.md), scenariusz demo: [docs/pitch-i-demo.md](docs/pitch-i-demo.md).

## Uruchomienie

```bash
npm install
npx expo start --lan --clear
```

- Telefon: aplikacja Expo Go, zeskanuj kod QR. (Zmiana ikony przykrywki działa tylko w zbudowanej aplikacji.)
- Android, wersja release: `npm run android:release` (JDK 17).
- AI: skopiuj `.env.example` do `.env.local` i wpisz klucz z https://aistudio.google.com/apikey. Bez klucza aplikacja działa, tylko bez funkcji AI.
- Weryfikator pakietów: `npm run verifier`, potem http://localhost:8123 (przykładowe pakiety w `verifier/demo/`).
- Testy: `npm test` (jednostkowe, m.in. kryptografia, łańcuch, RFC 3161, raport, reguły prawne).

## Zespół

- Jan Bancerewicz
- Piotr Uszyński
- Maciej Rapicki
- Franciszek Fabiński
- Karolina Glaza

## Wykorzystane zasoby i AI

Zgodnie z zasadami HackYeah ujawniamy zewnętrzne modele, API, biblioteki i narzędzia AI.

**Narzędzia AI użyte przy tworzeniu projektu**
- **Claude Code** (Anthropic): pomoc przy programowaniu, debugowaniu, projektowaniu interfejsu i dokumentacji. Zespół odpowiada za całość rozwiązania i rozumie jego działanie.

**Modele i usługi w aplikacji**
- **Google Gemini API** (`gemini-3.5-flash`, zapasowo `gemini-3.5-flash-lite`): opcjonalna ocena wpisu i porządkowanie opisu. Według warunków Gemini API (28.04.2026) w EOG treści nie są używane do ulepszania usług Google, także w darmowym planie.
- **FreeTSA** (https://freetsa.org): znaczniki czasu RFC 3161.

**Biblioteki i zasoby** (licencje open source)
- Expo SDK 57, React Native, expo-router oraz moduły Expo: camera, audio, crypto, secure-store, file-system, print, sharing, screen-capture, sensors, image-picker, document-picker, keep-awake, font (MIT)
- `@noble/hashes` (MIT): scrypt, HKDF, HMAC · `asn1js`, `pkijs` (BSD-3-Clause): RFC 3161 i CMS · `fflate` (MIT): ZIP · `zustand` (MIT) · `@react-native-community/datetimepicker` (MIT) · `@react-native-async-storage/async-storage` (MIT)
- Ikony: Ionicons przez `@expo/vector-icons` (MIT). Ikony przykrywek: własne SVG renderowane skryptem `scripts/generate-icons.mjs` (`sharp`, Apache-2.0).
- Czcionka logo: **Lexend** (SIL Open Font License 1.1) przez `@expo-google-fonts/lexend`.
- Treści prawne i telefony pomocowe: akty prawne i oficjalne strony, lista źródeł w [docs/research-prawny.md](docs/research-prawny.md).

**Film demo i prezentacja**
- Montaż i animacje: **Remotion** (kod w osobnym projekcie), przy pomocy Claude Code.
- Muzyka, efekty dźwiękowe i ujęcia filmowe: **Mixkit** (Mixkit Free License).
- Lektor: **ElevenLabs** (synteza mowy, model `eleven_multilingual_v2`).
- Statystyki: Eurostat / FRA / EIGE, *EU gender-based violence survey* (2024); UN Women i UNODC, *Femicides in 2023* (2024).
