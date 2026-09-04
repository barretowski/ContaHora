import { minutesToLabel } from './time';
import { isoToBr, monthLabel } from './month';
import { STATUS_LABEL } from '../types';
import { computeTotals, sortedByDate, type ReportData } from './report';

/** Gera e baixa o relatório do mês em PDF (jspdf carregado sob demanda). */
export async function downloadPdf(d: ReportData, filename: string) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const rows = sortedByDate(d.entries);
  const t = computeTotals(rows);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('ContaHora — Relatório de Horas Extras', 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Funcionário: ${d.personName}`, 14, 27);
  doc.text(`Mês: ${monthLabel(d.month)}`, 14, 33);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 40,
    head: [['Data', 'Duração', 'Status', 'Descrição']],
    body: rows.length
      ? rows.map((e) => [
          isoToBr(e.date),
          minutesToLabel(e.minutes),
          STATUS_LABEL[e.status],
          e.description ?? '',
        ])
      : [['—', '—', '—', 'Nenhum lançamento neste mês']],
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: [24, 103, 192] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 24 },
      2: { cellWidth: 30 },
    },
  });

  // @ts-expect-error lastAutoTable é injetado pelo plugin
  const y = (doc.lastAutoTable?.finalY ?? 40) + 10;
  doc.setFontSize(12);
  doc.text(
    `Total: ${minutesToLabel(t.totalMinutes)}  (${t.count} lançamento${t.count === 1 ? '' : 's'})`,
    14,
    y,
  );
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Pendente: ${minutesToLabel(t.pendente)}`, 14, y + 7);
  doc.text(`Paga: ${minutesToLabel(t.paga)}`, 64, y + 7);
  doc.text(`Compensada: ${minutesToLabel(t.compensada)}`, 104, y + 7);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  doc.text(
    `Gerado em ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    14,
    y + 16,
  );

  doc.save(filename);
}
