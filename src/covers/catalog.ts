import type { CoverId, ValueKind } from './canonical';

/** One action inside a cover that the user may choose as her key. */
export interface CoverAction {
  id: string;
  kind: ValueKind;
  title: string;
  /** Plain-language instruction shown in the key setup. */
  howTo: string;
  example: string;
  /** Number of possible steps (for sequences), used in the strength estimate. */
  alphabet?: number;
}

export interface CoverInfo {
  id: CoverId;
  /** Launcher label on Android. On iOS the name is always "Przybornik". */
  label: string;
  description: string;
  actions: CoverAction[];
}

export const COVERS: CoverInfo[] = [
  {
    id: 'przepisy',
    label: 'Przepisy',
    description: 'Książka kucharska z przepisami, ulubionymi i notatkami.',
    actions: [
      {
        id: 'search',
        kind: 'text',
        title: 'Wyszukanie frazy',
        howTo: 'Wpisz swoją frazę w wyszukiwarkę przepisów (pole z lupą) i zatwierdź na klawiaturze.',
        example: 'np. „ciasto babci zosi”',
      },
      {
        id: 'addRecipe',
        kind: 'text',
        title: 'Dodanie przepisu o wybranej nazwie',
        howTo: 'Dodaj nowy przepis (+) i wpisz swoją nazwę. Po ✓ przepis się nie zapisze.',
        example: 'np. „pierniczki na święta”',
      },
      {
        id: 'editIngredient',
        kind: 'number',
        title: 'Zmiana ilości składnika',
        howTo: 'Otwórz wybrany przepis, naciśnij ołówek przy „Składniki”, zmień ilość wybranego składnika na swoją liczbę i naciśnij ✓. Przepis się nie zmieni.',
        example: 'np. sernik → twaróg → 1250',
      },
      {
        id: 'note',
        kind: 'text',
        title: 'Notatka do przepisu',
        howTo: 'Otwórz wybrany przepis, wpisz swoją frazę w „Notatki” na dole i naciśnij „Zapisz”.',
        example: 'np. „mniej cukru dla mamy”',
      },
      {
        id: 'favSeq',
        kind: 'sequence',
        title: 'Ulubione w kolejności',
        howTo: 'Na liście przepisów stuknij serduszka wybranych przepisów w swojej kolejności (dokładnie 5).',
        example: 'np. sernik → rosół → sernik → pierogi → placki',
        alphabet: 12,
      },
    ],
  },
  {
    id: 'zadania',
    label: 'Zadania',
    description: 'Lista zadań: dom i zakupy, z terminami.',
    actions: [
      {
        id: 'addTask',
        kind: 'text',
        title: 'Dodanie zadania o wybranej treści',
        howTo: 'Na wybranej liście (Dom albo Zakupy) wpisz zadanie ze swoją treścią i naciśnij +. Zadanie się nie zapisze.',
        example: 'np. Zakupy → „kupić mąkę ziemniaczaną”',
      },
      {
        id: 'addTaskDue',
        kind: 'number',
        title: 'Zadanie z wybranym terminem',
        howTo: 'Wpisz dowolne zadanie, naciśnij budzik i ustaw swój termin (dzień, miesiąc, godzina), potem +. Zadanie się nie zapisze.',
        example: 'np. termin 14.03 o 17:45',
      },
      {
        id: 'search',
        kind: 'text',
        title: 'Wyszukanie frazy',
        howTo: 'Naciśnij lupę, wpisz swoją frazę i zatwierdź na klawiaturze.',
        example: 'np. „odebrać paczkę z poczty”',
      },
    ],
  },
  {
    id: 'woda',
    label: 'Pij wodę',
    description: 'Licznik wypitej wody i napojów z celem dziennym.',
    actions: [
      {
        id: 'goal',
        kind: 'number',
        title: 'Cel dzienny',
        howTo: 'Naciśnij ikonę suwaków w prawym górnym rogu, wpisz swoją liczbę jako „Dzienny cel (ml)” i naciśnij „Zapisz”. Cel się nie zmieni.',
        example: 'np. 2350',
      },
      {
        id: 'customAmount',
        kind: 'number',
        title: 'Dodanie wybranej ilości',
        howTo: 'Naciśnij „+ ml” pod napojami, wpisz swoją liczbę ml i naciśnij ✓. Nic się nie doda.',
        example: 'np. 1375',
      },
      {
        id: 'drinkSeq',
        kind: 'sequence',
        title: 'Napoje w kolejności',
        howTo: 'Stuknij napoje w swojej kolejności (dokładnie 5). Nic się nie doda.',
        example: 'np. woda → kawa → woda → herbata → herbata',
        alphabet: 3,
      },
      {
        id: 'note',
        kind: 'text',
        title: 'Notatka dnia',
        howTo: 'Wpisz swoją frazę w „Notatka” i naciśnij „Zapisz”.',
        example: 'np. „mniej kawy po południu”',
      },
    ],
  },
  {
    id: 'urodziny',
    label: 'Urodziny',
    description: 'Urodziny bliskich i odliczanie dni.',
    actions: [
      {
        id: 'addDate',
        kind: 'number',
        title: 'Osoba z wybraną datą urodzin',
        howTo: 'Dodaj dowolną osobę (ikona osoby z plusem), wpisz swoją datę urodzin z rokiem i naciśnij ✓. Osoba się nie zapisze.',
        example: 'np. 14 . 03 . 1987',
      },
      {
        id: 'addPerson',
        kind: 'text',
        title: 'Osoba o wybranym imieniu',
        howTo: 'Dodaj osobę (ikona osoby z plusem), wpisz swoją frazę jako imię i naciśnij ✓. Osoba się nie zapisze.',
        example: 'np. „ciocia basia z gdyni”',
      },
      {
        id: 'gift',
        kind: 'text',
        title: 'Pomysł na prezent',
        howTo: 'Otwórz dowolną osobę, wpisz swoją frazę w „Prezent” i naciśnij „Zapisz”.',
        example: 'np. „szalik w kratę”',
      },
    ],
  },
  {
    id: 'ksiazki',
    label: 'Czytelniczka',
    description: 'Czytane książki i postęp czytania.',
    actions: [
      {
        id: 'isbn',
        kind: 'number',
        title: 'Książka z wybranym numerem ISBN',
        howTo: 'Dodaj dowolną książkę (+), wpisz swoją liczbę w polu ISBN i naciśnij ✓. Książka się nie zapisze.',
        example: 'np. 978837',
      },
      {
        id: 'addBook',
        kind: 'text',
        title: 'Książka o wybranym tytule',
        howTo: 'Dodaj książkę (+), wpisz swoją frazę jako tytuł i naciśnij ✓. Książka się nie zapisze.',
        example: 'np. „ogród nad jeziorem”',
      },
      {
        id: 'quote',
        kind: 'text',
        title: 'Notatka do książki',
        howTo: 'Otwórz wybraną książkę, wpisz swoją frazę w „Notatki” i naciśnij „Zapisz”.',
        example: 'np. „wrócić do rozdziału 3”',
      },
    ],
  },
  {
    id: 'kwiatki',
    label: 'Moje kwiatki',
    description: 'Przypomnienia o podlewaniu roślin.',
    actions: [
      {
        id: 'waterSeq',
        kind: 'sequence',
        title: 'Podlewanie w kolejności',
        howTo: 'Stuknij kroplę przy roślinach w swojej kolejności (dokładnie 5). Nic się nie zapisze.',
        example: 'np. monstera → bazylia → monstera → storczyk → aloes',
        alphabet: 6,
      },
      {
        id: 'addPlant',
        kind: 'text',
        title: 'Roślina o wybranej nazwie',
        howTo: 'Dodaj roślinę (+), wpisz swoją frazę jako nazwę i naciśnij ✓. Roślina się nie zapisze.',
        example: 'np. „zamiokulkas od mamy”',
      },
      {
        id: 'note',
        kind: 'text',
        title: 'Notatka do rośliny',
        howTo: 'Otwórz wybraną roślinę, wpisz swoją frazę w „Notatka” i naciśnij „Zapisz”.',
        example: 'np. „nawozić od maja”',
      },
    ],
  },
];

export function coverInfo(id: CoverId): CoverInfo {
  return COVERS.find((c) => c.id === id)!;
}

export function coverAction(cover: CoverId, actionId: string): CoverAction | undefined {
  return coverInfo(cover).actions.find((a) => a.id === actionId);
}
