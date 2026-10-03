# Teczka (na telefonie: „Przybornik”)

**Dowody, których sprawca nie znajdzie, nie usunie i nie podważy.**

Co piąta kobieta w UE (20,3%) doznała przemocy ekonomicznej ze strony partnera, a tylko 6,1% zgłasza przemoc partnera na policję (EU Gender-Based Violence Survey, Eurostat/FRA/EIGE). W Polsce w 2025 r. policja wszczęła 29 770 procedur „Niebieskiej Karty”.

Od 2023 r. polskie prawo wprost nazywa przemoc ekonomiczną przemocą domową. Udowodnić ją jest jednak trudno: sprawca przegląda telefon, dowody znikają, a zrzuty ekranu zbywa się jako „podróbki”.

Teczka to zmienia. Wygląda jak zwykła aplikacja (przepisy, urodziny i inne) i naprawdę nią jest. Sejf otwiera tylko sekretna czynność, np. ustawienie twarogu w serniku na 1250 g. W środku każdy dowód jest zaszyfrowany, opatrzony zewnętrznym znacznikiem czasu i gotowy do przekazania policji, prawnikowi lub sądowi w formie, którą każdy sprawdzi bez naszej aplikacji.

Chcemy, żeby żadna osoba doznająca przemocy nie musiała wybierać między bezpieczeństwem a dowodem.

## Jak to działa

- **Kamuflaż.** Aplikacja wygląda jak jedna z 6 zwykłych, w pełni działających aplikacji: przepisy, lista zadań, licznik wody, kalendarz urodzin, dziennik czytania albo podlewanie kwiatków. Sejf otwiera **czynność, którą użytkowniczka sama wybrała jako klucz**, np. „zmień ilość twarogu w serniku na 1250 i zapisz”. Każda inna czynność działa normalnie, a czynność-klucz nigdy się nie zapisuje.
- **Szyfrowany sejf** na zdjęcia, nagrania, zrzuty ekranu, dokumenty (np. wyciągi z konta) i opisy zdarzeń. Klucz chroni Keystore/Keychain, a zdjęcia nie trafiają do galerii.
- **Integralność.** Każdy wpis ma SHA-256 w łańcuchu hashy i znacznik czasu **RFC 3161** z zewnętrznego serwera (TSA). Do serwera trafia tylko skrót, nigdy treść.
- **Raport i pakiet dowodów.** Raport PDF układa wpisy według kategorii z formularza „Niebieska Karta – A” i „historii przemocy” z NK-C. Pakiet ZIP zawiera oryginały, tokeny `.tsr` i instrukcję weryfikacji, którą każdy powtórzy bez aplikacji (`openssl` albo strona `verifier/`).
- **AI (opcjonalnie)** porządkuje język opisów. Nie dodaje faktów: każde zdanie musi wskazywać źródłowe wpisy, liczby i daty spoza wpisów są oznaczane, a zatwierdza użytkowniczka.
- **Szybkie wyjście** jest zawsze pod ręką: przycisk, potrząśnięcie, podwójne „wstecz”, wyjście z aplikacji i bezczynność.

> Research prawny ze źródłami: [docs/research-prawny.md](docs/research-prawny.md) · model zagrożeń: [docs/model-zagrozen.md](docs/model-zagrozen.md) · architektura: [docs/architektura.md](docs/architektura.md) · pitch i scenariusz demo: [docs/pitch-i-demo.md](docs/pitch-i-demo.md)

## Stan projektu (3.10.2026)

| Element | Stan |
|---|---|
| Logika: kryptografia, łańcuch, RFC 3161, przykrywki, raport, pakiet, walidacja AI | ✅ 100 testów jednostkowych przechodzi (`npm test`; 2 testy sieciowe są domyślnie pomijane) |
| Prawdziwy znacznik czasu z FreeTSA i weryfikacja `openssl ts -verify` | ✅ „Verification: OK” (`npm run tsa:smoke`) |
| Weryfikator w przeglądarce (`verifier/`) | ✅ sprawdzony na pakiecie demo: oryginał cały zielony, zmiana jednego słowa wykryta |
| Bundle aplikacji (Metro, Android i iOS) | ✅ `npx expo export` buduje się bez błędów |
| Natywny projekt Androida (`expo prebuild`): 6 aliasów, ikony, uprawnienia | ✅ manifest wygenerowany i sprawdzony |
| Serwer AI (proxy) | ✅ start, autoryzacja, walidacja i obsługa błędów sprawdzone. ⚠️ Wywołania Claude nie testowano, bo potrzebny jest Twój klucz API |
| Uruchomienie na emulatorze Androida (release, Pixel 8, API 36) | ✅ onboarding, wpis, zdjęcie z aparatu, znacznik FreeTSA, szybkie wyjście. Odblokowanie ~0,65 s (wcześniejszy build: ~16 s) |
| **iPhone (Expo Go)** | ⚠️ do sprawdzenia przez Ciebie (lista kontrolna niżej) |
| Zmiana ikony na iOS | ⚠️ kod jest, ale bez płatnego konta Apple Developer nie da się tego przetestować |

## Struktura

```
app/                 ekrany (expo-router): przykrywka (index), powitanie/ (onboarding), sejf/ (wnętrze)
src/covers/          6 przykrywek (ui/), katalog czynności-kluczy, normalizacja, sekwencje, daty (urodziny, podlewanie)
src/vault/           klucze (scrypt + HKDF + AES-GCM), zaszyfrowany magazyn, sesja, szybkie wyjście, dowody
src/integrity/       kanoniczny JSON, łańcuch hashy, klient RFC 3161, kolejka TSA, weryfikacja pakietu, podpis CMS
src/report/          model raportu (NK-A / NK-C), HTML→PDF, manifest i ZIP
src/ai/              pseudonimizacja, walidacja odpowiedzi, klient proxy
src/content/         przepisy, formy przemocy z NK-A, treści „Pomoc” (ze zweryfikowanego researchu)
modules/cover-switcher/  natywny moduł Expo (Kotlin + Swift): przełączanie ikony/nazwy w launcherze
plugins/with-cover-aliases.js  config plugin: <activity-alias> ×6 (Android), CFBundleAlternateIcons (iOS)
server/              proxy AI (Node 24 + @anthropic-ai/sdk), klucz API zostaje poza telefonem
verifier/            strona do weryfikacji pakietu ZIP w przeglądarce (+ demo/ z przykładowymi pakietami)
docs/                research prawny, model zagrożeń, architektura, pitch
```

## Wymagania

- Node.js 24 (jest), git, Python 3 (tylko do lokalnego serwowania weryfikatora).
- **Konto Expo** (darmowe). Od 3.09.2026 Expo Go na iOS wymaga zalogowania w CLI i w aplikacji:
  ```bash
  npx expo login
  ```
- **Android Studio** do demo na emulatorze (instrukcja niżej).

## Instalacja

```bash
npm install
```

## Uruchomienie na emulatorze Androida (demo na komputerze)

1. Zainstaluj **Android Studio** z https://developer.android.com/studio (instalator dla Windows, domyślne komponenty: Android SDK, Android Virtual Device).
2. W Android Studio otwórz **More Actions → SDK Manager**:
   - zakładka *SDK Platforms*: zaznacz **Android 16 (API 36)**,
   - zakładka *SDK Tools*: zaznacz **Android SDK Build-Tools 36**, **NDK (Side by side)** i **Android Emulator**.

   Projekt używa compileSdk 36, Build-Tools 36.0.0 i NDK 27.1 (z `react-native/gradle/libs.versions.toml`).
3. **More Actions → Virtual Device Manager → Create device**: Pixel (dowolny), obraz systemu **API 36, Google APIs, x86_64**.
4. Ustaw zmienne środowiskowe (Windows, „Edytuj zmienne środowiskowe dla konta”):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - `JAVA_HOME` = **JDK 17**, np. `%USERPROFILE%\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2` albo Temurin 17. Nie `Android Studio\jbr`: to JDK 25, na którym build pada w `react-native-worklets:configureCMake` („A restricted method in java.lang.System has been called”).
   - do `Path` dopisz `%ANDROID_HOME%\platform-tools` i `%ANDROID_HOME%\emulator`
5. Uruchom emulator z Virtual Device Manager, potem w terminalu (nowym, żeby wczytał zmienne):
   ```bash
   npm run android
   ```
   Pierwszy build Gradle trwa kilkanaście minut. Komenda generuje `android/`, kompiluje moduł `cover-switcher` i instaluje aplikację „Przepisy” na emulatorze.

Gdy `android/` powstaje od nowa (`npx expo prebuild`), dopisz w `android/local.properties`:

```
cmake.dir=C:/Users/<Ty>/AppData/Local/Android/Sdk/cmake/4.1.2
```

Domyślny CMake 3.22 ma `ninja` bez obsługi długich ścieżek i build pada na plikach `react-native-gesture-handler` („Filename longer than 260 characters”).

### Szybkość w emulatorze

`npm run android` buduje wersję **debug**: kod JS przychodzi z Metro, bez optymalizacji i z narzędziami deweloperskimi. Działa kilka razy wolniej niż prawdziwa aplikacja. Do demo i do oceny szybkości używaj wersji release (bez Metro):

```bash
npm run android:release
```

Ustawienia emulatora (Device Manager → ołówek przy urządzeniu → Show Advanced Settings):

- **RAM: 4096 MB.** Przy domyślnych 2048 MB Android 16 z usługami Google sam się dławi (komunikaty „System UI isn't responding”).
- **Camera → Back: Emulated** zamiast *VirtualScene*. Wirtualna scena 3D mocno obciąża komputer.
- **Graphics: Hardware.**

## Testy na iPhonie (Expo Go)

```bash
npx expo start
```

Zeskanuj kod QR aparatem iPhone'a. W Expo Go trzeba się zalogować na to samo konto co w CLI.

W Expo Go działa wszystko **poza zmianą ikony**. Lista kontrolna:

- [ ] onboarding: wybór przykrywki, wybór czynności, nagranie klucza (2×), próba na czysto,
- [ ] każda przykrywka działa jak zwykła aplikacja, a czynność-klucz otwiera Teczkę i **nie zapisuje się**,
- [ ] nowy wpis ze zdjęciem z aparatu: zdjęcia **nie ma** w galerii iPhone'a,
- [ ] nagranie audio i odtworzenie we wpisie,
- [ ] znacznik czasu pojawia się przy wpisie (potrzebny internet),
- [ ] raport PDF i pakiet ZIP otwierają się w arkuszu „Udostępnij”,
- [ ] szybkie wyjście: przycisk, potrząśnięcie, wyjście do ekranu głównego, po czym widać przykrywkę,
- [ ] w przełączniku aplikacji zawartość Teczki jest rozmyta.

## AI (opcjonalne): Google Gemini, darmowy limit

Aplikacja woła Gemini bezpośrednio z telefonu, bez serwera. Używają go „Ocena i prawo” (jak poważny jest wpis) i „Uporządkuj z AI”.

1. Klucz: https://aistudio.google.com/apikey
2. `copy .env.example .env.local` i wpisz klucz w `EXPO_PUBLIC_GEMINI_API_KEY` (`.env.local` nie trafia do gita).
3. Uruchom Expo ponownie z `--clear`.

Uwaga: w darmowej wersji Google może używać przesłanych treści do ulepszania usług, a klucz wbudowany w aplikację da się z niej wyciągnąć. Na demo wystarczy; w pilotażu z prawdziwymi użytkowniczkami potrzebna jest płatna wersja z umową o przetwarzaniu danych. Ocena modelu nigdy nie spada poniżej twardych sygnałów zagrożenia (`src/legal/severity.ts`), np. duszenie to zawsze najwyższy poziom. Alternatywny serwer z Claude jest w `server/`.

## Skrypty

| Komenda | Co robi |
|---|---|
| `npm test` | testy jednostkowe (Jest) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run tsa:smoke` | prawdziwy znacznik z FreeTSA i `openssl ts -verify` |
| `npm run demo:package` | buduje `verifier/demo/teczka-demo.zip` (i wersję z jedną zmianą) z prawdziwymi znacznikami |
| `npm run build:verifier` | buduje `verifier/verify.js` z kodu aplikacji |
| `npm run verifier` | serwuje weryfikator na http://localhost:8123 |
| `npm run icons` | generuje ikony przykrywek ze źródeł SVG |

## Ważne ograniczenia (szczegóły w [modelu zagrożeń](docs/model-zagrozen.md))

- Klucza nie da się odzyskać, więc kopia zapasowa to eksport pakietu do zaufanej osoby.
- Program szpiegujący z nagrywaniem ekranu łamie każde zabezpieczenie aplikacji.
- iOS pokazuje systemowy komunikat po zmianie ikony, a nazwa pod ikoną zostaje „Przybornik”.
- Używane serwery TSA (FreeTSA, Sectigo) **nie są kwalifikowane** w rozumieniu eIDAS. Znacznik jest dopuszczalny jako dowód, ale bez domniemania z art. 41 ust. 2.
- Sklepy z aplikacjami zakazują ukrytych funkcji. Dystrybucja to otwarta kwestia (research, pkt 9).
