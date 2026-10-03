/**
 * The closed list of provisions the offline hints may point to. Every citation and summary
 * comes from docs/research-prawny.md (items marked ✅, verified 2026-10-03). Do not add a
 * provision here without adding it, with its source, to that document first.
 *
 * Wording rule: a hint says what a provision MAY cover. Whether it applies is decided by the
 * prosecutor or the court, never by the app.
 */
import { why, type HintContext } from './match';

export type HintKind = 'ochrona' | 'definicja' | 'karne' | 'rodzinne' | 'pomoc' | 'dowod';

export const KIND_LABEL: Record<HintKind, string> = {
  ochrona: 'Ochrona',
  definicja: 'Ustawa o przeciwdziałaniu przemocy domowej',
  karne: 'Kodeks karny',
  rodzinne: 'Kodeks rodzinny',
  pomoc: 'Pomoc',
  dowod: 'Dowody',
};

export interface Rule {
  id: string;
  kind: HintKind;
  title: string;
  /** Short label for the card, e.g. "art. 207 kk". */
  short: string;
  law: string;
  summary: string;
  tip?: string;
  note?: string;
  helpSlug?: string;
  /** Reasons (quotes, ticked options); no reason means the hint is not shown. */
  match: (ctx: HintContext) => (string | null)[];
}

const UPPD = 'ustawy o przeciwdziałaniu przemocy domowej';

// Word stems are matched on lowercase text without Polish letters, at the start of a word.
export const MONEY = [
  'zabral mi karte', 'zabral karte', 'zabiera mi pieniadze', 'zabral mi pieniadze', 'nie daje mi pieniedzy',
  'nie dal mi pieniedzy', 'nie daje pieniedzy', 'musze prosic o pieniadze', 'kieszonkowe', 'kontroluje konto',
  'zablokowal konto', 'zablokowal karte', 'nie pozwala mi pracowac', 'nie pozwala pracowac', 'zabronil mi pracy',
  'rozlicza mnie', 'kaze sie rozliczac', 'paragon', 'zabral wyplate', 'zabiera wyplate', 'moja pensje',
];
export const THREATS = [
  'grozi', 'grozil', 'grozba', 'grozby', 'zabije', 'zabic', 'zabijesz', 'pozalujesz', 'zrobie ci krzywde',
  'skrzywdze', 'zastrzele', 'podpale', 'udusze', 'zniszcze cie',
];
export const DANGER = ['zabije', 'zabic', 'udusze', 'dusil', 'noz ', 'nozem', 'noza', 'siekier', 'bronia', 'bron palna', 'zastrzele', 'podpale'];
export const STALKING = [
  'wydzwania', 'neka', 'nekal', 'sledzi', 'sledzil', 'czeka pod', 'czekal pod', 'przychodzi pod', 'obserwuje',
  'setki wiadomosci', 'pisze bez przerwy', 'nie daje mi spokoju', 'nie daje spokoju',
];
export const ONLINE = [
  'zdjecia bez zgody', 'zdjecie bez zgody', 'opublikowal', 'rozeslal', 'wrzucil do internetu', 'udostepnil moje',
  'grozi ze opublikuje', 'grozil ze opublikuje', 'pisze obelgi', 'wyzywa w wiadomosciach',
];
export const LOCKED_OUT = [
  'zmienil zamki', 'zmienil zamek', 'nie wpuszcza', 'nie wpuscil', 'zabral klucze', 'zabral mi klucze',
  'wylaczyl prad', 'wylaczyl ogrzewanie', 'odcial prad', 'zamknal mnie', 'wyrzucil mnie z domu', 'wyrzucil mnie z mieszkania',
];
export const HOME = ['wyrzuci mnie', 'wyrzucil mnie', 'wynos sie', 'to moje mieszkanie', 'to moj dom', 'nie masz prawa tu mieszkac'];
export const PHYSICAL = ['popchn', 'szarpa', 'szarpnal', 'uderzyl', 'bije', 'bil mnie', 'spoliczk', 'kopnal', 'kopie', 'scisnal', 'zlapal mnie', 'dusil'];
export const PSYCHO = ['wyzywa', 'wyzywal', 'poniza', 'ponizyl', 'krzyczy', 'krzyczal', 'obraza', 'izoluje', 'zabrania mi', 'nie pozwala mi wychodzic', 'wysmiewa'];
export const SPYING = [
  'czyta moje wiadomosci', 'czytal moje wiadomosci', 'sprawdza moj telefon', 'przeglada moj telefon', 'przegladal moj telefon',
  'zna moje haslo', 'zna moje hasla', 'lokalizacj', 'podsluch', 'nagrywa mnie', 'wie co pisze', 'aplikacje szpieg',
];
export const INJURY = ['siniak', 'sinia', 'krwaw', 'zlaman', 'spuchn', 'obrazen', 'rana', 'rany', 'guz'];
export const REPEAT = ['znowu', 'znow', 'ciagle', 'codziennie', 'od lat', 'od miesiecy', 'kolejny raz', 'po raz kolejny', 'jak zawsze', 'za kazdym razem'];
export const CHILD_WORDS = ['przy dzieciach', 'przy dziecku', 'dzieci widzialy', 'dzieci slyszaly', 'corka widziala', 'syn widzial', 'corka slyszala', 'syn slyszal'];
const MARRIED = ['maz', 'zona', 'malzon'];

const married = (ctx: HintContext) =>
  MARRIED.some((w) => (ctx.profile?.relation ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').includes(w));

export const RULES: Rule[] = [
  {
    id: 'ochrona',
    short: 'Policja i sąd: nakazy, zakazy',
    kind: 'ochrona',
    title: 'Możesz prosić o natychmiastową ochronę',
    law: 'art. 15aa i 15aaa ustawy o Policji; art. 11a i 11aa ' + UPPD,
    summary:
      'Policja może nakazać osobie stosującej przemoc natychmiastowe opuszczenie mieszkania i zakazać zbliżania się oraz kontaktu. Sąd może to orzec na dłużej.',
    note: 'Nakazy policji obowiązują 14 dni, chyba że sąd je przedłuży. W zagrożeniu życia dzwoń pod 112.',
    helpSlug: 'ochrona',
    match: (ctx) => [
      ctx.entry.injuries === true ? 'Zaznaczyłaś obrażenia' : null,
      why.words(ctx, DANGER),
      ctx.profile?.firearm === 'tak' ? 'W profilu: osoba stosująca przemoc ma broń palną' : null,
      ctx.entry.forms.includes('fizyczna') ? why.repeated(ctx, ['fizyczna']) : null,
    ],
  },
  {
    id: 'def-ekonomiczna',
    short: 'Ustawa o przemocy, art. 2',
    kind: 'definicja',
    title: 'To może być przemoc ekonomiczna',
    law: 'art. 2 ust. 1 pkt 1 lit. d ' + UPPD,
    summary:
      'Ustawa wprost nazywa przemocą domową ograniczanie albo pozbawianie dostępu do pieniędzy, możliwości podjęcia pracy lub samodzielności finansowej.',
    tip: 'Pomagają wyciągi z konta, potwierdzenia przelewów, zrzuty ekranu z bankowości i wiadomości o pieniądzach.',
    helpSlug: 'przemoc-ekonomiczna',
    match: (ctx) => [why.form(ctx, ['ekonomiczna']), why.words(ctx, MONEY)],
  },
  {
    id: 'def-fizyczna',
    short: 'Ustawa o przemocy, art. 2',
    kind: 'definicja',
    title: 'To może być przemoc fizyczna lub seksualna',
    law: 'art. 2 ust. 1 pkt 1 lit. b ' + UPPD,
    summary: 'Ustawa obejmuje działania naruszające nietykalność cielesną albo wolność, w tym seksualną.',
    match: (ctx) => [why.form(ctx, ['fizyczna', 'seksualna']), why.words(ctx, PHYSICAL)],
  },
  {
    id: 'def-psychiczna',
    short: 'Ustawa o przemocy, art. 2',
    kind: 'definicja',
    title: 'To może być przemoc psychiczna',
    law: 'art. 2 ust. 1 pkt 1 lit. c i e ' + UPPD,
    summary: 'Ustawa obejmuje działania wywołujące cierpienie lub krzywdę oraz poczucie zagrożenia, poniżenia lub udręczenia.',
    match: (ctx) => [why.form(ctx, ['psychiczna']), why.words(ctx, PSYCHO)],
  },
  {
    id: 'def-elektroniczna',
    short: 'Ustawa o przemocy, art. 2',
    kind: 'definicja',
    title: 'To może być przemoc przez telefon lub internet',
    law: 'art. 2 ust. 1 pkt 1 lit. e ' + UPPD,
    summary: 'Ustawa obejmuje istotne naruszanie prywatności i wzbudzanie poczucia zagrożenia lub poniżenia, także za pomocą środków komunikacji elektronicznej.',
    tip: 'Rób zrzuty ekranu z widoczną datą i nadawcą.',
    match: (ctx) => [why.form(ctx, ['elektroniczna']), why.words(ctx, ONLINE)],
  },
  {
    id: 'kk-207',
    short: 'art. 207 kk',
    kind: 'karne',
    title: 'Znęcanie się',
    law: 'art. 207 § 1 Kodeksu karnego',
    summary: 'Karze znęcanie się fizyczne lub psychiczne nad osobą najbliższą albo zależną od sprawcy.',
    note: 'Ściganie z urzędu: nie musisz składać wniosku. Kwalifikację ocenia prokurator i sąd.',
    helpSlug: 'zgloszenie',
    match: (ctx) => {
      const form = why.form(ctx, ['fizyczna', 'psychiczna']);
      if (!form) return [];
      const repeated = why.repeated(ctx, ['fizyczna', 'psychiczna']) ?? why.words(ctx, REPEAT);
      return repeated ? [form, repeated] : [];
    },
  },
  {
    id: 'kk-190',
    short: 'art. 190 kk',
    kind: 'karne',
    title: 'Groźba karalna',
    law: 'art. 190 Kodeksu karnego',
    summary: 'Dotyczy grożenia popełnieniem przestępstwa, gdy groźba wzbudza uzasadnioną obawę, że zostanie spełniona.',
    note: 'Ściganie na wniosek pokrzywdzonej.',
    helpSlug: 'zgloszenie',
    match: (ctx) => [why.words(ctx, THREATS), why.tag(ctx, ['grożenie'])],
  },
  {
    id: 'kk-190a',
    short: 'art. 190a kk',
    kind: 'karne',
    title: 'Uporczywe nękanie',
    law: 'art. 190a § 1 Kodeksu karnego',
    summary: 'Karze uporczywe nękanie, które wzbudza uzasadnione poczucie zagrożenia, poniżenia lub udręczenia albo istotnie narusza prywatność.',
    note: 'Ściganie na wniosek pokrzywdzonej. Sąd może też zakazać kontaktu, także przez telefon i internet (art. 11aa ' + UPPD + ').',
    tip: 'Zapisuj każde zdarzenie: daty i liczba prób kontaktu pokazują uporczywość.',
    helpSlug: 'ochrona',
    match: (ctx) => [why.words(ctx, STALKING)],
  },
  {
    id: 'kk-191',
    short: 'art. 191 kk',
    kind: 'karne',
    title: 'Utrudnianie korzystania z mieszkania',
    law: 'art. 191 § 1a Kodeksu karnego',
    summary: 'Dotyczy zmuszania przez uporczywą „przemoc innego rodzaju”, np. istotne utrudnianie korzystania z mieszkania.',
    note: 'Ściganie na wniosek pokrzywdzonej.',
    match: (ctx) => [why.words(ctx, LOCKED_OUT)],
  },
  {
    id: 'kk-217',
    short: 'art. 217 kk',
    kind: 'karne',
    title: 'Naruszenie nietykalności cielesnej',
    law: 'art. 217 Kodeksu karnego',
    summary: 'Dotyczy uderzenia lub innego naruszenia nietykalności cielesnej.',
    note: 'Oskarżenie prywatne. Przy powtarzających się zdarzeniach może wchodzić w grę znęcanie się (art. 207).',
    match: (ctx) => (ctx.entry.forms.includes('fizyczna') ? [why.words(ctx, PHYSICAL), why.tag(ctx, ['bicie', 'szarpanie', 'kopanie', 'popychanie'])] : []),
  },
  {
    id: 'kk-209',
    short: 'art. 209 kk',
    kind: 'karne',
    title: 'Niepłacenie alimentów',
    law: 'art. 209 § 1 i 1a Kodeksu karnego',
    summary: 'Dotyczy uchylania się od alimentów określonych wyrokiem, ugodą lub umową, gdy zaległość to co najmniej 3 świadczenia.',
    note: 'Ściganie na wniosek. Z urzędu, gdy przyznano świadczenia z funduszu alimentacyjnego.',
    match: (ctx) => [why.words(ctx, ['aliment']), why.tag(ctx, ['niełożenie na utrzymanie'])],
  },
  {
    id: 'kk-267',
    short: 'art. 267 kk',
    kind: 'karne',
    title: 'Podglądanie telefonu, podsłuch',
    law: 'art. 267 § 1 i 3 Kodeksu karnego',
    summary: 'Karze uzyskanie dostępu do cudzych informacji przez przełamanie zabezpieczeń oraz zakładanie podsłuchu lub programu szpiegującego.',
    note: 'Ściganie na wniosek. Jeśli ktoś może mieć dostęp do Twojego telefonu, zajrzyj do „Bezpieczeństwo telefonu”.',
    helpSlug: 'bezpieczny-telefon',
    match: (ctx) => [why.words(ctx, SPYING)],
  },
  {
    id: 'kro-28',
    short: 'art. 27–28 kro',
    kind: 'rodzinne',
    title: 'Pieniądze na utrzymanie rodziny',
    law: 'art. 27 i 28 § 1 Kodeksu rodzinnego i opiekuńczego',
    summary:
      'Oboje małżonkowie mają obowiązek przyczyniać się do potrzeb rodziny. Jeśli jeden tego nie robi, sąd może nakazać wypłacanie jego wynagrodzenia do rąk drugiego.',
    helpSlug: 'pieniadze',
    match: (ctx) => {
      if (!married(ctx)) return [];
      const money = why.form(ctx, ['ekonomiczna']) ?? why.words(ctx, MONEY);
      return money ? [money, `W profilu: ${ctx.profile?.relation}`] : [];
    },
  },
  {
    id: 'kro-281',
    short: 'art. 28¹ kro',
    kind: 'rodzinne',
    title: 'Prawo do mieszkania',
    law: 'art. 28¹ Kodeksu rodzinnego i opiekuńczego',
    summary: 'Jeśli mieszkanie należy do jednego małżonka, drugi może z niego korzystać w celu zaspokojenia potrzeb rodziny.',
    helpSlug: 'pieniadze',
    match: (ctx) => {
      if (!married(ctx)) return [];
      const home = why.words(ctx, HOME);
      return home ? [home] : [];
    },
  },
  {
    id: 'lekarz',
    short: 'Ustawa o przemocy, art. 3',
    kind: 'pomoc',
    title: 'Bezpłatne badanie i zaświadczenie lekarskie',
    law: 'art. 3 ust. 1 pkt 5 ' + UPPD,
    summary: 'Masz prawo do bezpłatnego badania i zaświadczenia lekarskiego o przyczynach i rodzaju obrażeń.',
    tip: 'Idź do lekarza jak najszybciej i zrób zdjęcia obrażeń w Teczce.',
    helpSlug: 'lekarz',
    match: (ctx) => [ctx.entry.injuries === true ? 'Zaznaczyłaś obrażenia' : null, why.words(ctx, INJURY)],
  },
  {
    id: 'dzieci',
    short: 'Ustawa o przemocy, art. 2',
    kind: 'pomoc',
    title: 'Dziecko, które widzi przemoc, też jej doznaje',
    law: 'art. 2 ust. 2 ' + UPPD,
    summary: 'Małoletni świadek przemocy domowej jest w świetle ustawy osobą doznającą przemocy.',
    match: (ctx) => [ctx.entry.childrenPresent === true ? 'Zaznaczyłaś, że były przy tym dzieci' : null, why.words(ctx, CHILD_WORDS)],
  },
  {
    id: 'nagrania',
    short: 'art. 168a kpk, 308 kpc',
    kind: 'dowod',
    title: 'Nagranie jako dowód',
    law: 'art. 168a Kodeksu postępowania karnego; art. 308 Kodeksu postępowania cywilnego',
    summary: 'Nagrania mogą być dowodem w sprawie karnej i cywilnej; sąd ocenia je razem z innymi dowodami.',
    note: 'Nagrywaj tylko rozmowy, w których sama uczestniczysz. Nagrywanie cudzych rozmów może podlegać art. 267 § 3 kk.',
    helpSlug: 'nagrania',
    match: (ctx) => [ctx.entry.attachmentKinds.includes('audio') ? 'Do wpisu jest dołączone nagranie' : null],
  },
];

/** Shown last whenever anything else applies: the general route to help. */
export const BLUE_CARD = {
  id: 'niebieska-karta',
  short: 'Ustawa o przemocy, art. 9d',
  kind: 'pomoc' as HintKind,
  title: 'Procedura „Niebieskie Karty”',
  law: 'art. 9d ' + UPPD,
  summary:
    'Formularz wypełnia np. policjant, pracownik socjalny albo lekarz, w Twojej obecności. Raport z Teczki pomoże w tej rozmowie.',
  helpSlug: 'niebieska-karta',
  reasons: ['Ogólna droga pomocy, gdy dzieje się przemoc domowa'],
};
