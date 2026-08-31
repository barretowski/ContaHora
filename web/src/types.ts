export type Role = 'USER' | 'ADMIN';
export type EntryStatus = 'PENDENTE' | 'PAGA' | 'COMPENSADA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface OvertimeEntry {
  id: string;
  userId: string;
  date: string; // ISO
  minutes: number;
  description: string | null;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonthSummary {
  month: string; // "YYYY-MM"
  totalMinutes: number;
  count: number;
  minutesPendente: number;
  minutesPaga: number;
  minutesCompensada: number;
}

export interface SummaryResponse {
  year: number;
  userId: string;
  months: MonthSummary[];
  totals: Omit<MonthSummary, 'month'>;
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  PENDENTE: 'Pendente',
  PAGA: 'Paga',
  COMPENSADA: 'Compensada',
};

export const STATUS_COLOR: Record<EntryStatus, string> = {
  PENDENTE: 'warning',
  PAGA: 'success',
  COMPENSADA: 'info',
};
