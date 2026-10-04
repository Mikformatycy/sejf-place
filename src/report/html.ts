import { CONTACTS } from '@/content/pomoc';
import { formLabel, formNkLabel } from '@/content/formy';
import { formatAmount, moneyAmounts } from '@/content/pieniadze';
import { formatInstant, formatOccurred } from '@/ui/format';

import type { LiveEntry, ReportModel } from './model';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const para = (s: string) => esc(s).replace(/\n/g, '<br/>');

const STATUS_LABEL = {
  ok: 'zgodny',
  deleted: 'treść usunięta, ogniwo zachowane',
  'hash-mismatch': 'NIEZGODNY: treść zmieniona',
  'broken-link': 'NIEZGODNY: przerwany łańcuch',
  'bad-seq': 'NIEZGODNY: zła numeracja',
} as const;

function details(e: LiveEntry): string {
  const c = e.content;
  return [
    ...moneyAmounts(c).map((x) => `${esc(x.tag)}: ${formatAmount(x.amount, x.currency)}`),
    c.injuries ?`obrażenia${c.injuriesDescription ? `: ${esc(c.injuriesDescription)}` : ''}` : '',
    c.childrenPresent ? 'dzieci obecne' : '',
    c.witnesses ? `świadkowie: ${esc(c.witnesses)}` : '',
    c.place ? esc(c.place) : '',
    c.isFirst ? 'pierwszy raz' : '',
    c.correctionOf ? 'korekta' : '',
    c.attachments.length ? `załączniki: ${c.attachments.length}` : '',
  ]
    .filter(Boolean)
    .join('<br/>');
}

const row = (e: LiveEntry) => `
    <tr>
      <td>${e.seq}</td>
      <td class="nowrap">${esc(formatOccurred(e.content.occurredAt, e.content.occurredApprox))}</td>
      <td>${e.content.forms.map((f) => esc(formLabel(f))).join(', ')}</td>
      <td>${e.content.description ? para(e.content.description) : '—'}</td>
      <td>${details(e)}</td>
      <td class="nowrap small">${e.tsa ? esc(formatInstant(e.tsa.genTime)) : '—'}</td>
    </tr>`;

/** Minimal, print-ready A4 report: one table of entries. The author's descriptions are quoted verbatim. */
export function renderReportHtml(m: ReportModel, reportId: string): string {
  const total = m.entries.length + m.deleted.length;
  const problems = m.chain.checks.filter((c) => c.status !== 'ok' && c.status !== 'deleted');
  const summary = [
    `wpisy: ${m.entries.length}${m.deleted.length ? ` (+${m.deleted.length} usunięte)` : ''}`,
    ...m.byForm.map((g) => `${esc(formNkLabel(g.form))}: ${g.seqs.length}`),
    m.profile.relation ? `relacja: ${esc(m.profile.relation)}` : '',
    m.profile.firearm ? `broń palna: ${esc(m.profile.firearm)}` : '',
    m.profile.childrenCount ? `dzieci w domu: ${esc(m.profile.childrenCount)}` : '',
  ].filter(Boolean);

  const ai = m.ai?.items.length
    ? `<p class="small"><b>Podsumowanie zatwierdzone przez autorkę</b> (z pomocą ${esc(m.ai.model)}; rozstrzygają oryginalne opisy):</p>
       <ul class="small">${m.ai.items.map((i) => `<li>${para(i.text)}</li>`).join('')}</ul>`
    : '';

  const moneyTotal = m.money.reduce((n, g) => n + g.total, 0);
  const money = m.money.length
    ? `<table class="narrow">
    <tr><th>Pieniądze</th><th>Wpisy</th><th>Suma kwot wpisanych przez autorkę</th></tr>
    ${m.money.map((g) => `<tr><td>${esc(g.label)}</td><td>${g.count}</td><td class="nowrap">${formatAmount(g.total)}</td></tr>`).join('')}
    ${m.money.length > 1 && moneyTotal ? `<tr><th>Razem</th><th></th><th class="nowrap">${formatAmount(moneyTotal)}</th></tr>` : ''}
  </table>`
    : '';

  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 15mm; }
  :root { color-scheme: light; }
  body { font-family: -apple-system, Roboto, "Segoe UI", Arial, sans-serif; font-size: 9.5pt; color: #1f2328; background: #fff; line-height: 1.35; margin: 0; }
  h1 { font-size: 15pt; margin: 0 0 2pt; }
  p { margin: 4pt 0; }
  .muted { color: #5e6670; } .small { font-size: 8.5pt; } .nowrap { white-space: nowrap; }
  table { border-collapse: collapse; width: 100%; margin-top: 8pt; }
  th, td { border: 1px solid #d5d9de; padding: 4pt 5pt; text-align: left; vertical-align: top; }
  th { background: #f1f3f5; font-size: 8.5pt; }
  tr { page-break-inside: avoid; }
  ul { margin: 2pt 0; padding-left: 14pt; }
  table.narrow { width: auto; }
</style></head>
<body>
  <h1>Chronologia zdarzeń</h1>
  <p class="muted small">${esc(reportId)} · ${esc(formatInstant(m.generatedAt))} · Opisy autorki bez zmian. Dokument nie jest formularzem „Niebieska Karta”.</p>
  <p class="small">${summary.join(' · ')}</p>
  ${ai}
  ${money}
  <table>
    <tr><th>Nr</th><th>Data</th><th>Rodzaj</th><th>Opis</th><th>Szczegóły</th><th>Znacznik czasu</th></tr>
    ${m.entries.map(row).join('')}
  </table>
  <p class="small">Integralność: ${m.chain.ok ? 'wpisy niezmienione od zapisu' : '<b>WYKRYTO ZMIANĘ WPISÓW</b>'}, znaczniki czasu: ${m.counts.stamped} z ${total}.${
    problems.length ? ` ${problems.map((c) => `Nr ${c.seq}: ${STATUS_LABEL[c.status]}.`).join(' ')}` : ''
  } Weryfikacja: pakiet ZIP z sejf-place.</p>
  <p class="muted small">Pomoc: ${CONTACTS.slice(0, 4).map((c) => `${esc(c.short)} ${esc(c.phone)}`).join(' · ')}</p>
</body></html>`;
}
