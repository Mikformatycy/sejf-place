# Model zagrożeń

**Główny przeciwnik:** osoba stosująca przemoc, mieszkająca z użytkowniczką albo mająca do niej regularny dostęp. Zakładamy, że:
- zna kod blokady telefonu albo może zmusić do odblokowania,
- przegląda galerię, listę aplikacji, historię połączeń, powiadomienia, ostatnie aplikacje i pocztę,
- może mieć dostęp do wspólnego konta Google lub iCloud, logów routera albo rachunku za telefon,
- nie jest ekspertem od kryminalistyki cyfrowej, ale może poszukać w internecie „aplikacje do ukrywania zdjęć”,
- w skrajnym przypadku instaluje oprogramowanie szpiegujące (stalkerware).

Cele ochrony, w kolejności ważności:
1. **Bezpieczeństwo użytkowniczki**: przeciwnik nie może zauważyć, że dokumentuje przemoc.
2. **Poufność dowodów.**
3. **Integralność dowodów**: da się wykazać, że niczego nie zmieniono.
4. **Dostępność**: dowody nie mogą łatwo przepaść.

## Zagrożenia, zabezpieczenia i ryzyka, które zostają

| # | Zagrożenie | Co robi Teczka | Co zostaje (ryzyko rezydualne) |
|---|---|---|---|
| 1 | Przeciwnik otwiera aplikację | Widzi działającą przykrywkę z prawdziwymi danymi (przepisy, zadania, wypita woda). Sejf otwiera tylko czynność-klucz, której nic w interfejsie nie zdradza. | Ktoś znający projekt może podejrzewać aplikację o nietypowej nazwie. |
| 2 | Lista aplikacji | Android: nazwa i ikona przykrywki w launcherze; w ustawieniach systemowych widnieje „Pocket” (`pl.przybornik.app`). iOS: zawsze „Pocket”. | Systemowa lista aplikacji pokazuje nieznaną aplikację. Historia zakupów w sklepie pokaże prawdziwą nazwę, jeśli aplikacja trafi do sklepu. |
| 3 | Zmiana ikony na iOS | Działa przez `setAlternateIconName`. | **iOS zawsze pokazuje systemowy komunikat** o zmianie ikony. Wybór przykrywki najlepiej zrobić raz, w bezpiecznym momencie. |
| 4 | Galeria | Aparat i mikrofon w Teczce zapisują tylko do zaszyfrowanego magazynu. Po imporcie z galerii aplikacja przypomina o usunięciu oryginału (również z „Ostatnio usuniętych”). | Zrzuty ekranu robione systemowo trafiają do galerii, zanim użytkowniczka je zaimportuje. |
| 5 | Ostatnie aplikacje i zrzuty ekranu | Android: `FLAG_SECURE` na ekranach sejfu (pusta miniatura, blokada zrzutów). iOS: rozmycie w przełączniku aplikacji. Wyjście do tła zawsze zamyka sejf. | iOS nie blokuje zrzutów ekranu w ogólności. |
| 6 | Przeciwnik podchodzi w trakcie | Przycisk „✕ Wyjdź” na każdym ekranie, potrząśnięcie, podwójne „wstecz” (Android), auto-blokada po 1–5 min. Wyjście kasuje historię nawigacji i odszyfrowane pliki tymczasowe, a przykrywka wraca do „czystego” stanu (np. przepis na sernik bez zmian). | Kilka sekund widoczności, zanim użytkowniczka zareaguje. |
| 7 | Odgadnięcie klucza w przykrywce | Klucz to czynność, cel i wartość (np. przepis, składnik i liczba). Minimalna siła: liczba ≥ 4 cyfry (zalecane 6), fraza ≥ 8 liter, sekwencja ≥ 5, rytm ≥ 6. | Rytm i sekwencje mają mało kombinacji (np. 2⁶ = 64), co aplikacja uczciwie pokazuje. Prób w przykrywce nie da się sensownie limitować, bo pomyłka wygląda jak zwykłe użycie. |
| 8 | Klawiatura zapamiętuje frazę | Pola, w które można wpisać frazę-klucz: bez autokorekty, autouzupełniania i sprawdzania pisowni. Na Androidzie typ „visible-password” wyłącza podpowiedzi w większości klawiatur. | **Na iOS klawiatura może mimo to uczyć się słów.** Onboarding na iPhonie zaleca klucze liczbowe. Działania klawiatur innych firm nie zweryfikowano. |
| 9 | Kradzież lub zabranie telefonu z odblokowanym ekranem | Dane są zaszyfrowane AES-256-GCM kluczem głównym. Klucz główny jest opakowany kluczem z `scrypt(klucz-czynność) + klucz urządzenia z Keystore/Keychain` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). | Ekspert z dostępem do Keystore/Keychain (root/jailbreak) mógłby przeprowadzić atak słownikowy na klucz o małej entropii. Poza zakresem przeciwnika. |
| 10 | Kopia zapasowa na wspólnym koncie | Android: `allowBackup=false`. Klucze w Keychain/Keystore nie trafiają do kopii (`THIS_DEVICE_ONLY`), więc odtworzone pliki są nieczytelne. | Po przywróceniu kopii na innym telefonie dane są **nie do odczytania**, także dla użytkowniczki. Zabezpieczeniem jest eksport pakietu. |
| 11 | Utrata lub zniszczenie telefonu | Eksport pakietu ZIP z raportem i oryginałami do zaufanej osoby albo organizacji. | Bez wcześniejszego eksportu dowody przepadają. Aplikacja zachęca do regularnych kopii. |
| 12 | Ślady w sieci (router, DNS) | Znaczniki czasu pobierane są tylko przy otwartym sejfie, nigdy w tle. Wysyłany jest sam skrót. AI włącza się tylko na żądanie, za zgodą. | Logi DNS routera mogą pokazać zapytanie do `freetsa.org` albo serwera AI. |
| 13 | Ślady po wysyłce | Ostrzeżenie przed udostępnieniem: plik zostaje w „Wysłanych” wybranej aplikacji. Plik tymczasowy jest usuwany po udostępnieniu. | To zależy od aplikacji, przez którą użytkowniczka wysyła. |
| 14 | Historia połączeń z telefonami zaufania | Informacja przy numerach w „Pomocy”. | Połączenie zostaje w historii. |
| 15 | Deep link do sejfu | `+native-intent` przekierowuje każdy link na przykrywkę. Strażnik sejfu wymaga odblokowanej sesji. | Brak. |
| 16 | Nadpisanie istniejącego sejfu | Utworzenie sejfu jest możliwe tylko w pierwszym uruchomieniu (gdy w Keystore nie ma kluczy). | Brak. |
| 17 | Zapomniany klucz | Brak odzyskiwania, celowo, bo „przypomnienie” byłoby furtką dla przeciwnika. Ostrzeżenie w onboardingu. | Utrata danych bez kopii. |
| 18 | **Stalkerware** (nagrywanie ekranu, keylogger, dostęp do plików) | Żadna aplikacja tego nie obroni. Onboarding i „Pomoc” mówią o tym wprost i kierują do organizacji pomocowej, najlepiej z innego telefonu. | **Pełna kompromitacja.** |
| 19 | Zarzut „sfabrykowane / zmienione” | Wpisów nie edytujemy: korekta to nowy wpis, a usunięcie zostawia ślad w łańcuchu. SHA-256 oryginałów, łańcuch hashy, tokeny RFC 3161, pakiet weryfikowalny bez aplikacji. | Znacznik dowodzi istnienia danych w chwili T i braku zmian od T, ale **nie** dowodzi czasu zdarzenia ani prawdziwości treści. TSA nie jest kwalifikowany. |
| 20 | AI „dopisuje” fakty | Imiona są zamieniane na role przed wysłaniem. Każde zdanie wskazuje wpisy źródłowe. Liczby i miesiące spoza wpisów są flagowane. Użytkowniczka zatwierdza każde zdanie, a oryginały zawsze są w raporcie. | Walidacja nie wyłapie zmiany sensu bez liczb (np. „krzyczał” → „mówił”). Dlatego zatwierdzanie jest ręczne, a oryginały są nadrzędne. |

## Świadome kompromisy

- **Prefiltr 16-bitowy.** Każda czynność w przykrywce liczy HMAC i porównuje 16 bitów, a scrypt uruchamia się tylko przy zgodności. Przykrywka nie zwalnia, a przeciwnik z dostępem do Keystore i tak musi liczyć scrypt dla kandydatów.
- **Dane przykrywki nie są szyfrowane.** Mają wyglądać na normalnie używaną aplikację.
- **Znaczniki czasu z darmowego TSA.** Na demo i pilotaż to wystarczy (eIDAS art. 41 ust. 1). W produkcji: kwalifikowany dostawca z rejestru NCCert (płatny).
