import { minutesToLabel } from './time';
import { isoToBr, monthLabel } from './month';
import { STATUS_LABEL, type EntryStatus, type OvertimeEntry } from '../types';

export interface ReportData {
  personName: string;
  month: string; // "YYYY-MM"
  entries: OvertimeEntry[];
}

export interface ReportTotals {
  totalMinutes: number;
  count: number;
  pendente: number;
  paga: number;
  compensada: number;
}

export function computeTotals(entries: OvertimeEntry[]): ReportTotals {
  const t: ReportTotals = {
    totalMinutes: 0,
    count: entries.length,
    pendente: 0,
    paga: 0,
    compensada: 0,
  };
  for (const e of entries) {
    t.totalMinutes += e.minutes;
    if (e.status === 'PENDENTE') t.pendente += e.minutes;
    else if (e.status === 'PAGA') t.paga += e.minutes;
    else if (e.status === 'COMPENSADA') t.compensada += e.minutes;
  }
  return t;
}

/** entries em ordem crescente de data */
export function sortedByDate(entries: OvertimeEntry[]): OvertimeEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

function generatedLine(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Gerado em ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const st = (s: EntryStatus) => STATUS_LABEL[s];

/** Relatório em texto puro (.txt) */
export function buildTxt(d: ReportData): string {
  const rows = sortedByDate(d.entries);
  const t = computeTotals(rows);
  const lines: string[] = [];

  lines.push('ContaHora - Relatorio de Horas Extras');
  lines.push('=====================================');
  lines.push(`Funcionario: ${d.personName}`);
  lines.push(`Mes: ${monthLabel(d.month)}`);
  lines.push('');

  if (!rows.length) {
    lines.push('Nenhum lancamento neste mes.');
  } else {
    lines.push('Data        Duracao   Status       Descricao');
    lines.push('----------  --------  -----------  ------------------------------');
    for (const e of rows) {
      const data = isoToBr(e.date).padEnd(10);
      const dur = minutesToLabel(e.minutes).padEnd(8);
      const status = st(e.status).padEnd(11);
      lines.push(`${data}  ${dur}  ${status}  ${e.description ?? ''}`.trimEnd());
    }
  }

  lines.push('');
  lines.push('-------------------------------------');
  lines.push(`Total: ${minutesToLabel(t.totalMinutes)}  (${t.count} lancamento${t.count === 1 ? '' : 's'})`);
  lines.push(`  Pendente:   ${minutesToLabel(t.pendente)}`);
  lines.push(`  Paga:       ${minutesToLabel(t.paga)}`);
  lines.push(`  Compensada: ${minutesToLabel(t.compensada)}`);
  lines.push('');
  lines.push(generatedLine());

  return lines.join('\n');
}

/** Mensagem curta para colar no WhatsApp / e-mail */
export function buildMessage(d: ReportData): string {
  const rows = sortedByDate(d.entries);
  const t = computeTotals(rows);
  const lines: string[] = [];

  lines.push('*ContaHora - Horas Extras*');
  lines.push(`Funcionário: ${d.personName}`);
  lines.push(`Mês: ${monthLabel(d.month)}`);
  lines.push('');

  if (!rows.length) {
    lines.push('_Nenhum lançamento neste mês._');
  } else {
    for (const e of rows) {
      const desc = e.description ? ` - ${e.description}` : '';
      lines.push(
        `• ${isoToBr(e.date)} - ${minutesToLabel(e.minutes)} - ${st(e.status)}${desc}`,
      );
    }
  }

  lines.push('');
  lines.push(`*Total: ${minutesToLabel(t.totalMinutes)}* (${t.count} lançamento${t.count === 1 ? '' : 's'})`);
  lines.push(
    `Pendente: ${minutesToLabel(t.pendente)} | Paga: ${minutesToLabel(t.paga)} | Compensada: ${minutesToLabel(t.compensada)}`,
  );
  lines.push('');
  lines.push(`_${generatedLine()}_`);

  return lines.join('\n');
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
