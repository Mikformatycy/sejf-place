/**
 * Forms of violence exactly as listed in section IV of the "Niebieska Karta – A"
 * form (Rozporządzenie RM z 6.09.2023, Dz.U. 2023 poz. 1870, załącznik nr 1).
 */
export type ViolenceForm = 'fizyczna' | 'psychiczna' | 'seksualna' | 'ekonomiczna' | 'elektroniczna' | 'inne';

export type AttachmentKind = 'photo' | 'audio' | 'image' | 'document';

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  mime: string;
  size: number;
  /** SHA-256 of the original bytes, computed before encryption. */
  sha256: string;
  /** Device clock when the file entered the vault. */
  addedAt: string;
  source: 'camera' | 'microphone' | 'gallery' | 'files';
  /** Length of a recording made in the app. Absent in older entries and other files. */
  durationMs?: number;
}

/** Amount she gave for one ticked detail of economic violence. Nothing is estimated or converted. */
export interface MoneyAmount {
  /** The ticked detail (one of `tags`), e.g. "odmowa pieniędzy". */
  tag: string;
  /** In grosze: canonical JSON allows integers only. */
  amount: number;
  currency: string;
}

export interface EntryContent {
  /** "YYYY-MM-DDTHH:mm" as declared by the user (may be approximate). */
  occurredAt: string;
  occurredApprox: boolean;
  place: string;
  forms: ViolenceForm[];
  /** Quick-pick examples (from the NK-A form) chosen by the user. */
  tags: string[];
  description: string;
  injuries: boolean | null;
  injuriesDescription: string;
  witnesses: string;
  childrenPresent: boolean | null;
  /** Set only by the user, never inferred. Mirrors the NK-C "history" fields. */
  isFirst: boolean;
  attachments: Attachment[];
  /**
   * Only details she gave an amount for. Absent in older entries; canonical JSON drops
   * undefined, so their hashes are unchanged. Read through moneyAmounts().
   */
  amounts?: MoneyAmount[];
  /** First version of the money fields (3.10, one per entry). Never written any more. */
  money?: { kind: string; amount: number | null; currency: string };
  /** Id of an earlier entry this one corrects. Entries are never edited in place. */
  correctionOf?: string;
}

export interface TsaStamp {
  url: string;
  genTime: string;
  serial: string;
  policy: string;
  tsaName: string;
  /** Raw RFC 3161 TimeStampToken (CMS SignedData), base64 DER. */
  tokenB64: string;
}

export interface Entry {
  id: string;
  seq: number;
  /** Device clock when the entry was saved. */
  createdAt: string;
  prevHash: string;
  /** SHA-256 over the canonical JSON record, hex. */
  hash: string;
  /** null after the user deleted the content; the hash stays in the chain. */
  content: EntryContent | null;
  deletedAt?: string;
  tsa?: TsaStamp;
}

export interface Profile {
  relation: string;
  firearm: '' | 'tak' | 'nie' | 'nie wiem';
  childrenCount: string;
  /** Names replaced with roles before anything is sent to the optional AI service. */
  namesToHide: string;
}

export interface VaultSettings {
  shakeToExit: boolean;
  autoLockMinutes: number;
  tsaUrls: string[];
  aiServerUrl: string;
  aiToken: string;
  /** Dark theme inside the vault (the cover keeps its own look). Absent in older vaults. */
  darkMode?: boolean;
}

export interface ReportStamp {
  createdAt: string;
  pdfSha256: string;
  tsa?: TsaStamp;
}

export interface VaultIndex {
  v: 1;
  createdAt: string;
  entries: Entry[];
  profile: Profile;
  settings: VaultSettings;
  reports: ReportStamp[];
  /** Optional AI wording, only the sentences the user approved. */
  aiSummary?: import('@/report/model').AiSummary;
}

// Both verified on 2026-10-03 (`npm run tsa:smoke`): HTTPS, anonymous, RFC 3161. Neither is
// an eIDAS *qualified* service; see docs/research-prawny.md for what that means legally.
export const DEFAULT_TSA_URLS = ['https://freetsa.org/tsr', 'https://timestamp.sectigo.com'];

export function emptyIndex(now: string): VaultIndex {
  return {
    v: 1,
    createdAt: now,
    entries: [],
    profile: { relation: '', firearm: '', childrenCount: '', namesToHide: '' },
    settings: {
      shakeToExit: true,
      autoLockMinutes: 2,
      tsaUrls: [...DEFAULT_TSA_URLS],
      aiServerUrl: '',
      aiToken: '',
    },
    reports: [],
  };
}
