/**
 * Help content shown inside the vault. Every fact comes from docs/research-prawny.md
 * (verified 2026-10-03). Only contacts confirmed on official websites are listed.
 */

export const VERIFIED_AT = '3 października 2026';

export interface Contact {
  name: string;
  /** Few words for the compact list in the app. */
  short: string;
  phone: string;
  /** Digits for the dialer. */
  dial: string;
  hours: string;
  note?: string;
  source: string;
}

export const CONTACTS: Contact[] = [
  {
    name: 'Numer alarmowy',
    short: 'Alarmowy',
    phone: '112',
    dial: '112',
    hours: 'całodobowo',
    note: 'Gdy zagrożone jest życie lub zdrowie.',
    source: 'formularz NK-B (Dz.U. 2023 poz. 1870)',
  },
  {
    name: 'Niebieska Linia: Ogólnopolskie Pogotowie dla Osób Doznających Przemocy Domowej',
    short: 'Niebieska Linia',
    phone: '800 120 002',
    dial: '800120002',
    hours: 'całodobowo, bezpłatnie',
    note: 'Również e-mail: niebieskalinia@niebieskalinia.info oraz WhatsApp: 510 404 333.',
    source: 'niebieskalinia.info',
  },
  {
    name: 'Linia Pomocy Pokrzywdzonym',
    short: 'Pomoc pokrzywdzonym',
    phone: '116 006',
    dial: '116006',
    hours: 'całodobowo, 7 dni w tygodniu, bezpłatnie, anonimowo',
    note: 'Wsparcie psychologiczne i prawne. Z zagranicy: +48 222 309 900.',
    source: 'gov.pl (Ministerstwo Sprawiedliwości)',
  },
  {
    name: 'Centrum Praw Kobiet: telefon interwencyjny',
    short: 'Centrum Praw Kobiet',
    phone: '800 107 777',
    dial: '800107777',
    hours: 'całodobowo (po połączeniu wybierz 9)',
    note: 'Dyżur prawny: ten sam numer, wewn. 7, we wtorki 17:00–20:30. E-mail: pomoc@cpk.org.pl.',
    source: 'cpk.org.pl',
  },
  {
    name: 'Kryzysowy Telefon Zaufania (dla dorosłych)',
    short: 'Telefon zaufania',
    phone: '116 123',
    dial: '116123',
    hours: 'całodobowo, bezpłatnie; czat na 116sos.pl',
    note: 'Wsparcie w kryzysie emocjonalnym.',
    source: 'policja.pl',
  },
];

export interface Article {
  slug: string;
  title: string;
  /** Paragraphs; lines starting with "• " render as bullets. */
  body: string[];
  sources: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'przemoc-ekonomiczna',
    title: 'Czym jest przemoc ekonomiczna?',
    body: [
      'Od 22 czerwca 2023 r. ustawa o przeciwdziałaniu przemocy domowej wprost obejmuje zachowania, które ograniczają lub odbierają Ci dostęp do pieniędzy, możliwość podjęcia pracy albo uzyskania samodzielności finansowej.',
      'Przykłady z ustawy i z formularza „Niebieska Karta”:',
      '• odbieranie lub kontrolowanie pieniędzy, karty, dostępu do konta,',
      '• zabranianie pracy albo utrudnianie jej podjęcia,',
      '• niełożenie na utrzymanie rodziny, niezaspokajanie potrzeb materialnych,',
      '• niszczenie Twoich rzeczy, demolowanie mieszkania, wynoszenie i sprzedawanie sprzętów.',
      'Przemocą domową jest to także wtedy, gdy nie mieszkacie razem albo jesteście po rozstaniu.',
      'Co warto zapisywać: daty, kwoty, wyciągi z konta, potwierdzenia przelewów, zrzuty ekranu wiadomości o pieniądzach, odmowy wypłaty.',
    ],
    sources: ['art. 2 ust. 1 pkt 1 lit. d i pkt 2 lit. g ustawy o przeciwdziałaniu przemocy domowej', 'formularz NK-A, sekcja IV'],
  },
  {
    slug: 'niebieska-karta',
    title: '„Niebieska Karta” krok po kroku',
    body: [
      'Procedurę rozpoczyna wypełnienie formularza „Niebieska Karta – A”. Wypełnia go przedstawiciel służby, np. policjant, pracownik socjalny, lekarz, pielęgniarka, nauczyciel albo psycholog, w Twojej obecności. Ty nie wypełniasz tego formularza.',
      'Do rozpoczęcia procedury nie jest potrzebna Twoja zgoda ani zgoda osoby stosującej przemoc.',
      'Po wypełnieniu formularza dostajesz „Niebieską Kartę – B” z informacjami o Twoich prawach i pomocy.',
      'Formularz trafia do zespołu interdyscyplinarnego, a potem do grupy diagnostyczno-pomocowej, która spotyka się z Tobą i razem opracowuje plan pomocy. Spotkania z Tobą i z osobą stosującą przemoc odbywają się osobno.',
      'Jak pomaga Teczka: raport porządkuje Twoje wpisy według kategorii z formularza (fizyczna, psychiczna, seksualna, ekonomiczna, przez telefon lub internet, inne) i według „historii przemocy” (pierwsze, powtarzające się, ostatnie zdarzenie). Możesz go pokazać podczas rozmowy. Raport nie jest formularzem Niebieskiej Karty.',
    ],
    sources: ['art. 9d ustawy', 'rozporządzenie RM z 6.09.2023 r. (Dz.U. 2023 poz. 1870), § 2, § 6–8, § 11, § 18'],
  },
  {
    slug: 'ochrona',
    title: 'Natychmiastowa ochrona: nakazy i zakazy',
    body: [
      'Policja może wydać wobec osoby stosującej przemoc, która zagraża Twojemu życiu lub zdrowiu:',
      '• nakaz natychmiastowego opuszczenia wspólnego mieszkania i zakaz zbliżania się do niego,',
      '• zakaz zbliżania się do Ciebie na określoną odległość,',
      '• zakaz kontaktowania się z Tobą,',
      '• zakaz wstępu do Twojej szkoły lub miejsca pracy.',
      'Te środki działają od razu i tracą moc po 14 dniach, chyba że sąd je przedłuży.',
      'Możesz też złożyć wniosek do sądu, żeby zobowiązał osobę stosującą przemoc do opuszczenia mieszkania albo zakazał jej zbliżania się lub kontaktu, także gdy nęka Cię przez telefon lub internet.',
      'Pomoc w napisaniu wniosku dostaniesz bezpłatnie w organizacjach pomocowych i w punktach nieodpłatnej pomocy prawnej.',
    ],
    sources: ['art. 15aa, 15aaa, 15aab, 15ak ustawy o Policji', 'art. 11a i 11aa ustawy o przeciwdziałaniu przemocy domowej'],
  },
  {
    slug: 'zgloszenie',
    title: 'Zgłoszenie przestępstwa',
    body: [
      'Masz prawo złożyć zawiadomienie o przestępstwie na Policji lub w prokuraturze.',
      'Znęcanie się fizyczne lub psychiczne nad osobą najbliższą (art. 207 Kodeksu karnego) jest ścigane z urzędu. Kodeks nie przewiduje tu wniosku ofiary ani oskarżenia prywatnego.',
      'Niektóre przestępstwa są ścigane tylko na Twój wniosek, np. groźba karalna (art. 190), uporczywe nękanie (art. 190a), zmuszanie (art. 191). Naruszenie nietykalności (art. 217) ścigane jest z oskarżenia prywatnego.',
      'W Kodeksie karnym nie ma osobnego przestępstwa „przemocy ekonomicznej”. To, czy dane zachowania są np. znęcaniem się psychicznym, ocenia prokurator i sąd.',
      'Uchylanie się od alimentów określonych przez sąd lub ugodę (art. 209) jest przestępstwem, gdy zaległość wynosi co najmniej 3 świadczenia.',
    ],
    sources: ['art. 190, 190a, 191, 207, 209, 217 Kodeksu karnego (tekst ujednolicony z 28.08.2026)', 'formularz NK-B'],
  },
  {
    slug: 'lekarz',
    title: 'Badanie i zaświadczenie lekarskie',
    body: [
      'Masz prawo do bezpłatnego badania lekarskiego i zaświadczenia o przyczynach i rodzaju obrażeń związanych z przemocą domową.',
      'Zaświadczenie wystawia się na urzędowym wzorze. Poproś o nie wprost.',
      'Jeśli możesz, zrób też zdjęcia obrażeń w Teczce (aparat w Teczce nie zapisuje zdjęć w galerii).',
    ],
    sources: ['art. 3 ust. 1 pkt 5 ustawy o przeciwdziałaniu przemocy domowej', 'rozporządzenie MZ z 29.08.2023 r. (Dz.U. 2023 poz. 1827)'],
  },
  {
    slug: 'nagrania',
    title: 'Nagrania jako dowód',
    body: [
      'Sąd ocenia każdy dowód swobodnie. W sprawach karnych dowodu nie można odrzucić tylko dlatego, że uzyskano go z naruszeniem prawa (są wyjątki).',
      'Według omówień postanowienia Sądu Najwyższego z 26.06.2025 r. (I CSK 2855/24) nagranie zrobione bez wiedzy rozmówcy może być dowodem w sprawie cywilnej, jeśli potwierdzi się jego autentyczność.',
      'Nagrywanie rozmowy, w której sama uczestniczysz, jest według przeważającego poglądu zgodne z prawem. Nie nagrywaj ukrytym telefonem lub urządzeniem cudzych rozmów, w których nie bierzesz udziału: to może być przestępstwo (art. 267 § 3 Kodeksu karnego).',
      'Nie przerabiaj i nie skracaj nagrań. Teczka przechowuje oryginał i jego sumę kontrolną, co pomaga wykazać, że nic nie zostało zmienione.',
      'To nie jest porada prawna. W razie wątpliwości zapytaj prawniczkę lub prawnika z organizacji pomocowej.',
    ],
    sources: ['art. 168a kpk', 'art. 308 kpc', 'art. 267 kk', 'SN I CSK 2855/24 (według omówień)'],
  },
  {
    slug: 'znacznik-czasu',
    title: 'Co potwierdza znacznik czasu?',
    body: [
      'Każdy wpis dostaje sumę kontrolną (SHA-256) i znacznik czasu z zewnętrznego serwera (RFC 3161). Do serwera trafia tylko suma kontrolna, nigdy treść.',
      'Znacznik potwierdza, że wpis istniał najpóźniej w podanej chwili i od tamtej pory nikt go nie zmienił.',
      'Znacznik NIE potwierdza, kiedy wydarzyło się samo zdarzenie ani że zdjęcie przedstawia prawdę. Zdjęcie dodane z galerii po tygodniu ma znacznik z dnia dodania.',
      'Prawo UE (eIDAS) mówi, że znacznik czasu nie może zostać odrzucony jako dowód tylko dlatego, że jest elektroniczny. Najsilniejszy jest znacznik „kwalifikowany”, który korzysta z domniemania dokładności. Darmowy serwer używany w Teczce nie jest kwalifikowany.',
    ],
    sources: ['art. 3 pkt 33–34 i art. 41 rozporządzenia eIDAS (UE) 910/2014'],
  },
  {
    slug: 'pieniadze',
    title: 'Pieniądze w małżeństwie: co mówi prawo rodzinne',
    body: [
      'Oboje małżonkowie mają obowiązek przyczyniać się do utrzymania rodziny, każdy według swoich możliwości. Opieka nad dziećmi i praca w domu też się liczą.',
      'Jeśli małżonek nie dokłada się do potrzeb rodziny, sąd może nakazać, żeby jego wynagrodzenie (w całości lub części) było wypłacane bezpośrednio do Twoich rąk.',
      'Jeśli mieszkanie należy tylko do współmałżonka, masz prawo z niego korzystać w celu zaspokojenia potrzeb rodziny.',
      'Do takiej sprawy przydają się wyciągi z konta, potwierdzenia przelewów i zapis odmów.',
    ],
    sources: ['art. 27, 28, 28¹ Kodeksu rodzinnego i opiekuńczego'],
  },
  {
    slug: 'bezpieczny-telefon',
    title: 'Bezpieczeństwo telefonu',
    body: [
      '• Ustaw własny kod blokady telefonu, którego nikt nie zna.',
      '• Sprawdź, czy ktoś nie ma dostępu do Twojego konta Google lub iCloud (lista urządzeń, kopie zapasowe, udostępniona lokalizacja).',
      '• Usuwaj z galerii zdjęcia dodane do Teczki (także z folderu „Ostatnio usunięte”).',
      '• Połączenia z telefonami zaufania widać w historii połączeń. Możesz je z niej usunąć albo zadzwonić z innego telefonu.',
      '• Klawiatura może zapamiętywać wpisywane słowa. Jako klucz bezpieczniejsza jest liczba niż fraza.',
      '• Jeśli podejrzewasz program szpiegujący (np. bateria szybko się rozładowuje, sprawca wie, co piszesz), Teczka Cię nie ochroni. Porozmawiaj z organizacją pomocową z innego telefonu.',
      '• Regularnie wysyłaj kopię Teczki zaufanej osobie. Jeśli telefon zginie albo zostanie zniszczony, dane bez kopii przepadną.',
    ],
    sources: ['model zagrożeń projektu (docs/model-zagrozen.md)'],
  },
  {
    slug: 'ai',
    title: 'Jak działa AI w Teczce?',
    body: [
      'W widoku wpisu, w pasku na dole, są dwie funkcje AI (model Gemini od Google). Działają tylko wtedy, gdy je naciśniesz.',
      '• Ikona ✦ ocenia, jak poważne jest zdarzenie. Kolor ramki oceny: pomarańczowy – niepokojące, czerwony – poważne, ciemnoczerwony – może zagrażać życiu.',
      '• „Uporządkuj” poprawia pisownię i zdania w Twoim opisie. Nie dopisuje faktów ani dat. Twój oryginalny opis się nie zmienia: wersję AI włączasz przełącznikiem „Mój opis / Wersja AI”.',
      'Co jest wysyłane: data, rodzaje przemocy i opis tego wpisu. Przy ocenie także skróty kilku poprzednich wpisów, żeby model widział, czy coś się powtarza. Zdjęcia i nagrania nie są wysyłane.',
      'Imiona wpisane w Ustawieniach („Imiona do ukrycia przed AI”) są przed wysłaniem zamieniane na [osoba A], [osoba B]. Po powrocie odpowiedzi wracają na swoje miejsce.',
      'Darmowa wersja Gemini: Google może użyć wysłanego tekstu do ulepszania swoich usług.',
      'Do raportu trafia zarówno Twój opis, jak i wersja AI.',
    ],
    sources: ['ai.google.dev/gemini-api/terms'],
  },
];
