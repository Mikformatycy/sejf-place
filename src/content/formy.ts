import type { IconName } from '@/ui/kit';
import type { ViolenceForm } from '@/vault/types';

/**
 * Labels and examples follow section IV of the "Niebieska Karta – A" form
 * (Rozporządzenie RM z 6.09.2023, Dz.U. 2023 poz. 1870, zał. nr 1) and, for economic
 * violence, the statutory definition (art. 2 pkt 1 lit. d ustawy o przeciwdziałaniu
 * przemocy domowej, t.j. Dz.U. 2024 poz. 1673). Verified 2026-10-03.
 */
export const FORMS: { id: ViolenceForm; label: string; nkLabel: string; icon: IconName; examples: string[] }[] = [
  {
    id: 'fizyczna',
    icon: 'hand-right-outline',
    label: 'Fizyczna',
    nkLabel: 'Przemoc fizyczna',
    examples: ['bicie', 'szarpanie', 'kopanie', 'duszenie', 'popychanie', 'obezwładnianie'],
  },
  {
    id: 'psychiczna',
    icon: 'chatbubble-ellipses-outline',
    label: 'Psychiczna',
    nkLabel: 'Przemoc psychiczna',
    examples: ['izolowanie', 'wyzywanie', 'ośmieszanie', 'grożenie', 'krytykowanie', 'poniżanie'],
  },
  {
    id: 'seksualna',
    icon: 'alert-circle-outline',
    label: 'Seksualna',
    nkLabel: 'Przemoc seksualna',
    examples: ['zmuszanie do obcowania płciowego', 'zmuszanie do innych czynności seksualnych'],
  },
  {
    id: 'ekonomiczna',
    icon: 'wallet-outline',
    label: 'Ekonomiczna',
    nkLabel: 'Przemoc ekonomiczna',
    examples: [
      // Everyday forms of the statutory "ograniczanie dostępu do pieniędzy" (lit. d); amounts allowed.
      'odmowa pieniędzy',
      'zabieranie pieniędzy lub karty',
      'dług zaciągnięty bez zgody',
      'niełożenie na utrzymanie',
      'niezaspokajanie potrzeb materialnych',
      'niszczenie rzeczy osobistych',
      'demolowanie mieszkania',
      'wynoszenie lub sprzedawanie sprzętów domowych',
      // From the statutory definition (art. 2 pkt 1 lit. d):
      'ograniczanie dostępu do pieniędzy',
      'uniemożliwianie podjęcia pracy',
      'uniemożliwianie samodzielności finansowej',
    ],
  },
  {
    id: 'elektroniczna',
    icon: 'phone-portrait-outline',
    label: 'Przez telefon / internet',
    nkLabel: 'Przemoc za pomocą środków komunikacji elektronicznej',
    examples: [
      'wyzywanie, straszenie lub poniżanie przez telefon lub internet',
      'zdjęcia lub filmy bez zgody',
      'publikowanie lub rozsyłanie obrażających treści',
    ],
  },
  {
    id: 'inne',
    icon: 'ellipsis-horizontal-circle-outline',
    label: 'Inna',
    nkLabel: 'Inne',
    examples: [
      'zaniedbanie',
      'niezaspokajanie podstawowych potrzeb',
      'zmuszanie do picia alkoholu',
      'zmuszanie do zażywania środków odurzających lub leków',
    ],
  },
];

export const formLabel = (id: ViolenceForm) => FORMS.find((f) => f.id === id)?.label ?? id;
export const formNkLabel = (id: ViolenceForm) => FORMS.find((f) => f.id === id)?.nkLabel ?? id;
