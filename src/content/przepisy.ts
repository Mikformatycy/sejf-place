// Recipes for the "Przepisy" cover. Written for this project (no copied texts).

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'Ciasta' | 'Obiady' | 'Zupy' | 'Śniadania';
  minutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
}

export const RECIPES: Recipe[] = [
  {
    id: 'sernik',
    name: 'Sernik domowy',
    category: 'Ciasta',
    minutes: 90,
    servings: 12,
    ingredients: [
      { name: 'twaróg sernikowy', amount: 1000, unit: 'g' },
      { name: 'jajka', amount: 6, unit: 'szt.' },
      { name: 'cukier', amount: 200, unit: 'g' },
      { name: 'masło (miękkie)', amount: 100, unit: 'g' },
      { name: 'budyń waniliowy', amount: 1, unit: 'opak.' },
      { name: 'śmietana 18%', amount: 200, unit: 'g' },
      { name: 'herbatniki na spód', amount: 200, unit: 'g' },
    ],
    steps: [
      'Herbatniki ułóż ciasno na dnie tortownicy wyłożonej papierem.',
      'Masło utrzyj z cukrem na puszysto, dodawaj po jednym żółtku.',
      'Dodaj twaróg, śmietanę i budyń w proszku, zmiksuj krótko do gładkości.',
      'Białka ubij na sztywno i delikatnie wmieszaj szpatułką w masę.',
      'Piecz 60 minut w 160°C, potem zostaw w uchylonym piekarniku do ostygnięcia.',
    ],
  },
  {
    id: 'szarlotka',
    name: 'Szarlotka z kruszonką',
    category: 'Ciasta',
    minutes: 80,
    servings: 12,
    ingredients: [
      { name: 'mąka pszenna', amount: 400, unit: 'g' },
      { name: 'masło (zimne)', amount: 250, unit: 'g' },
      { name: 'cukier puder', amount: 100, unit: 'g' },
      { name: 'żółtka', amount: 3, unit: 'szt.' },
      { name: 'proszek do pieczenia', amount: 1, unit: 'łyżeczka' },
      { name: 'jabłka (szara reneta)', amount: 1500, unit: 'g' },
      { name: 'cynamon', amount: 1, unit: 'łyżeczka' },
    ],
    steps: [
      'Mąkę, masło, cukier puder, żółtka i proszek posiekaj nożem, a potem szybko zagnieć.',
      'Dwie trzecie ciasta rozłóż w formie, resztę schowaj do zamrażarki.',
      'Jabłka zetrzyj, odciśnij z soku i podduś z cynamonem przez 10 minut.',
      'Wyłóż jabłka na spód i zetrzyj na wierzch zamrożone ciasto.',
      'Piecz 50 minut w 180°C.',
    ],
  },
  {
    id: 'rosol',
    name: 'Rosół z kury',
    category: 'Zupy',
    minutes: 180,
    servings: 6,
    ingredients: [
      { name: 'kura lub ćwiartki', amount: 1000, unit: 'g' },
      { name: 'woda', amount: 3000, unit: 'ml' },
      { name: 'marchew', amount: 3, unit: 'szt.' },
      { name: 'pietruszka', amount: 2, unit: 'szt.' },
      { name: 'seler', amount: 0.25, unit: 'szt.' },
      { name: 'por (biała część)', amount: 1, unit: 'szt.' },
      { name: 'cebula opalona', amount: 1, unit: 'szt.' },
      { name: 'ziele angielskie', amount: 3, unit: 'ziarna' },
    ],
    steps: [
      'Mięso zalej zimną wodą i powoli doprowadź do wrzenia, zbierając szumowiny.',
      'Gotuj na bardzo małym ogniu przez 2 godziny.',
      'Dodaj obrane warzywa, opaloną cebulę i przyprawy, gotuj jeszcze godzinę.',
      'Przecedź, dopraw solą i podawaj z makaronem.',
    ],
  },
  {
    id: 'pierogi',
    name: 'Pierogi ruskie',
    category: 'Obiady',
    minutes: 120,
    servings: 5,
    ingredients: [
      { name: 'mąka pszenna', amount: 500, unit: 'g' },
      { name: 'ciepła woda', amount: 250, unit: 'ml' },
      { name: 'olej', amount: 2, unit: 'łyżki' },
      { name: 'ziemniaki', amount: 800, unit: 'g' },
      { name: 'twaróg półtłusty', amount: 300, unit: 'g' },
      { name: 'cebula', amount: 2, unit: 'szt.' },
    ],
    steps: [
      'Ugotuj ziemniaki i przeciśnij je razem z twarogiem.',
      'Cebulę zeszklij na oleju, połowę dodaj do farszu, dopraw pieprzem i solą.',
      'Z mąki, wody i oleju zagnieć elastyczne ciasto, odstaw na 20 minut.',
      'Rozwałkuj cienko, wykrawaj krążki, nakładaj farsz i dokładnie sklejaj.',
      'Gotuj partiami 2–3 minuty od wypłynięcia. Podawaj z resztą cebulki.',
    ],
  },
  {
    id: 'nalesniki',
    name: 'Naleśniki',
    category: 'Śniadania',
    minutes: 30,
    servings: 4,
    ingredients: [
      { name: 'mąka pszenna', amount: 250, unit: 'g' },
      { name: 'mleko', amount: 500, unit: 'ml' },
      { name: 'woda gazowana', amount: 200, unit: 'ml' },
      { name: 'jajka', amount: 2, unit: 'szt.' },
      { name: 'olej', amount: 2, unit: 'łyżki' },
    ],
    steps: [
      'Zmiksuj wszystkie składniki na gładkie, rzadkie ciasto.',
      'Odstaw na 15 minut.',
      'Smaż cienkie naleśniki na dobrze rozgrzanej patelni, po minucie z każdej strony.',
    ],
  },
  {
    id: 'placki',
    name: 'Placki ziemniaczane',
    category: 'Obiady',
    minutes: 40,
    servings: 4,
    ingredients: [
      { name: 'ziemniaki', amount: 1000, unit: 'g' },
      { name: 'cebula', amount: 1, unit: 'szt.' },
      { name: 'jajko', amount: 1, unit: 'szt.' },
      { name: 'mąka', amount: 3, unit: 'łyżki' },
      { name: 'olej do smażenia', amount: 100, unit: 'ml' },
    ],
    steps: [
      'Ziemniaki i cebulę zetrzyj na drobnych oczkach, odlej nadmiar wody.',
      'Dodaj jajko, mąkę, sól i pieprz, wymieszaj.',
      'Smaż na rozgrzanym oleju na złoto z obu stron.',
    ],
  },
  {
    id: 'pomidorowa',
    name: 'Zupa pomidorowa',
    category: 'Zupy',
    minutes: 30,
    servings: 6,
    ingredients: [
      { name: 'bulion', amount: 1500, unit: 'ml' },
      { name: 'passata pomidorowa', amount: 500, unit: 'g' },
      { name: 'śmietana 18%', amount: 150, unit: 'g' },
      { name: 'makaron lub ryż', amount: 200, unit: 'g' },
    ],
    steps: [
      'Zagotuj bulion z passatą i gotuj 10 minut.',
      'Zahartuj śmietanę kilkoma łyżkami gorącej zupy i wlej do garnka.',
      'Dopraw solą, pieprzem i szczyptą cukru. Podawaj z makaronem.',
    ],
  },
  {
    id: 'mielone',
    name: 'Kotlety mielone',
    category: 'Obiady',
    minutes: 45,
    servings: 4,
    ingredients: [
      { name: 'mięso mielone', amount: 500, unit: 'g' },
      { name: 'czerstwa bułka', amount: 1, unit: 'szt.' },
      { name: 'jajko', amount: 1, unit: 'szt.' },
      { name: 'cebula', amount: 1, unit: 'szt.' },
      { name: 'bułka tarta', amount: 100, unit: 'g' },
    ],
    steps: [
      'Bułkę namocz w wodzie i odciśnij.',
      'Wymieszaj mięso z bułką, jajkiem, startą cebulą, solą i pieprzem.',
      'Formuj kotlety, obtocz w bułce tartej i smaż po 5 minut z każdej strony.',
    ],
  },
  {
    id: 'gulasz',
    name: 'Gulasz wieprzowy',
    category: 'Obiady',
    minutes: 100,
    servings: 5,
    ingredients: [
      { name: 'łopatka wieprzowa', amount: 800, unit: 'g' },
      { name: 'cebula', amount: 2, unit: 'szt.' },
      { name: 'papryka czerwona', amount: 2, unit: 'szt.' },
      { name: 'koncentrat pomidorowy', amount: 2, unit: 'łyżki' },
      { name: 'papryka słodka mielona', amount: 1, unit: 'łyżka' },
    ],
    steps: [
      'Mięso pokrój w kostkę i obsmaż partiami.',
      'Dodaj cebulę i paprykę, smaż kilka minut.',
      'Wsyp przyprawy, dodaj koncentrat i szklankę wody, duś pod przykryciem 1 godzinę.',
    ],
  },
  {
    id: 'pierniczki',
    name: 'Pierniczki',
    category: 'Ciasta',
    minutes: 60,
    servings: 40,
    ingredients: [
      { name: 'mąka pszenna', amount: 500, unit: 'g' },
      { name: 'miód', amount: 200, unit: 'g' },
      { name: 'cukier', amount: 100, unit: 'g' },
      { name: 'masło', amount: 80, unit: 'g' },
      { name: 'przyprawa do piernika', amount: 20, unit: 'g' },
      { name: 'jajko', amount: 1, unit: 'szt.' },
    ],
    steps: [
      'Miód, cukier, masło i przyprawę podgrzej, aż się rozpuszczą, i przestudź.',
      'Dodaj mąkę i jajko, zagnieć gładkie ciasto.',
      'Rozwałkuj na 4 mm, wykrawaj kształty i piecz 10 minut w 180°C.',
    ],
  },
  {
    id: 'leniwe',
    name: 'Leniwe pierogi',
    category: 'Obiady',
    minutes: 30,
    servings: 3,
    ingredients: [
      { name: 'twaróg', amount: 500, unit: 'g' },
      { name: 'jajka', amount: 2, unit: 'szt.' },
      { name: 'mąka', amount: 200, unit: 'g' },
      { name: 'masło i bułka tarta do podania', amount: 2, unit: 'łyżki' },
    ],
    steps: [
      'Twaróg rozgnieć widelcem, dodaj jajka, szczyptę soli i mąkę.',
      'Uformuj wałki, spłaszcz i krój ukośnie na kluski.',
      'Gotuj 2 minuty od wypłynięcia, podawaj z masłem zrumienionym z bułką tartą.',
    ],
  },
  {
    id: 'salatka',
    name: 'Sałatka jarzynowa',
    category: 'Obiady',
    minutes: 60,
    servings: 8,
    ingredients: [
      { name: 'ziemniaki', amount: 4, unit: 'szt.' },
      { name: 'marchew', amount: 3, unit: 'szt.' },
      { name: 'pietruszka', amount: 2, unit: 'szt.' },
      { name: 'ogórki kiszone', amount: 4, unit: 'szt.' },
      { name: 'groszek konserwowy', amount: 400, unit: 'g' },
      { name: 'jajka', amount: 4, unit: 'szt.' },
      { name: 'majonez', amount: 200, unit: 'g' },
    ],
    steps: [
      'Warzywa ugotuj w mundurkach, jajka na twardo. Wystudź.',
      'Wszystko pokrój w drobną kostkę, dodaj odsączony groszek.',
      'Wymieszaj z majonezem, dopraw solą i pieprzem.',
    ],
  },
];

export function formatAmount(n: number): string {
  if (n === 0.25) return '¼';
  if (n === 0.5) return '½';
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}
