import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt.strategy';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

interface SummaryRow {
  month: string;
  totalMinutes: number;
  count: number;
  minutesPendente: number;
  minutesPaga: number;
  minutesCompensada: number;
}

interface OverviewRow {
  userId: string;
  name: string;
  email: string;
  totalMinutes: number;
  count: number;
  minutesPendente: number;
  minutesPaga: number;
  minutesCompensada: number;
}

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve de quem são os dados: usuário comum só vê os próprios. */
  private resolveTargetUser(actor: AuthUser, requestedUserId?: string): string {
    if (!requestedUserId || requestedUserId === actor.id) return actor.id;
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Sem permissão para ver outro usuário');
    }
    return requestedUserId;
  }

  private monthRange(month?: string): { gte: Date; lt: Date } | undefined {
    if (!month) return undefined;
    const [y, m] = month.split('-').map(Number);
    return {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    };
  }

  list(actor: AuthUser, month?: string, userId?: string) {
    const targetUserId = this.resolveTargetUser(actor, userId);
    const range = this.monthRange(month);
    return this.prisma.overtimeEntry.findMany({
      where: {
        userId: targetUserId,
        ...(range ? { date: range } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(actor: AuthUser, dto: CreateEntryDto) {
    return this.prisma.overtimeEntry.create({
      data: {
        userId: actor.id,
        date: new Date(dto.date),
        minutes: dto.minutes,
        description: dto.description,
        status: dto.status ?? 'PENDENTE',
      },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateEntryDto) {
    await this.ensureOwnership(actor, id);
    const data: Prisma.OvertimeEntryUpdateInput = {
      minutes: dto.minutes,
      description: dto.description,
      status: dto.status,
    };
    if (dto.date) data.date = new Date(dto.date);
    return this.prisma.overtimeEntry.update({ where: { id }, data });
  }

  async remove(actor: AuthUser, id: string) {
    await this.ensureOwnership(actor, id);
    await this.prisma.overtimeEntry.delete({ where: { id } });
    return { ok: true };
  }

  async summary(actor: AuthUser, year?: string, userId?: string) {
    const targetUserId = this.resolveTargetUser(actor, userId);
    const y = year ? Number(year) : new Date().getUTCFullYear();
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y + 1, 0, 1));

    const rows = await this.prisma.$queryRaw<SummaryRow[]>`
      SELECT to_char(date, 'YYYY-MM')                                        AS "month",
             SUM(minutes)::int                                              AS "totalMinutes",
             COUNT(*)::int                                                  AS "count",
             SUM(CASE WHEN status = 'PENDENTE'   THEN minutes ELSE 0 END)::int AS "minutesPendente",
             SUM(CASE WHEN status = 'PAGA'       THEN minutes ELSE 0 END)::int AS "minutesPaga",
             SUM(CASE WHEN status = 'COMPENSADA' THEN minutes ELSE 0 END)::int AS "minutesCompensada"
      FROM "OvertimeEntry"
      WHERE "userId" = ${targetUserId}
        AND date >= ${start}
        AND date <  ${end}
      GROUP BY 1
      ORDER BY 1
    `;

    const byMonth = new Map(rows.map((r) => [r.month, r]));
    const months = Array.from({ length: 12 }, (_, i) => {
      const key = `${y}-${String(i + 1).padStart(2, '0')}`;
      return (
        byMonth.get(key) ?? {
          month: key,
          totalMinutes: 0,
          count: 0,
          minutesPendente: 0,
          minutesPaga: 0,
          minutesCompensada: 0,
        }
      );
    });

    const totals = months.reduce(
      (acc, m) => ({
        totalMinutes: acc.totalMinutes + m.totalMinutes,
        count: acc.count + m.count,
        minutesPendente: acc.minutesPendente + m.minutesPendente,
        minutesPaga: acc.minutesPaga + m.minutesPaga,
        minutesCompensada: acc.minutesCompensada + m.minutesCompensada,
      }),
      {
        totalMinutes: 0,
        count: 0,
        minutesPendente: 0,
        minutesPaga: 0,
        minutesCompensada: 0,
      },
    );

    return { year: y, userId: targetUserId, months, totals };
  }

  /** Consolidado da equipe no mês (só ADMIN). */
  async overview(actor: AuthUser, month?: string) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso restrito');
    }
    const now = new Date();
    const key =
      month ??
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const range = this.monthRange(key)!;

    const rows = await this.prisma.$queryRaw<OverviewRow[]>`
      SELECT u.id                                                              AS "userId",
             u.name                                                           AS "name",
             u.email                                                          AS "email",
             COALESCE(SUM(e.minutes), 0)::int                                 AS "totalMinutes",
             COUNT(e.id)::int                                                 AS "count",
             COALESCE(SUM(CASE WHEN e.status = 'PENDENTE'   THEN e.minutes END), 0)::int AS "minutesPendente",
             COALESCE(SUM(CASE WHEN e.status = 'PAGA'       THEN e.minutes END), 0)::int AS "minutesPaga",
             COALESCE(SUM(CASE WHEN e.status = 'COMPENSADA' THEN e.minutes END), 0)::int AS "minutesCompensada"
      FROM "User" u
      LEFT JOIN "OvertimeEntry" e
        ON e."userId" = u.id
       AND e.date >= ${range.gte}
       AND e.date <  ${range.lt}
      WHERE u.active = true
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name ASC
    `;

    const totals = rows.reduce(
      (acc, r) => ({
        totalMinutes: acc.totalMinutes + r.totalMinutes,
        count: acc.count + r.count,
        minutesPendente: acc.minutesPendente + r.minutesPendente,
        minutesPaga: acc.minutesPaga + r.minutesPaga,
        minutesCompensada: acc.minutesCompensada + r.minutesCompensada,
      }),
      {
        totalMinutes: 0,
        count: 0,
        minutesPendente: 0,
        minutesPaga: 0,
        minutesCompensada: 0,
      },
    );

    return { month: key, users: rows, totals };
  }

  private async ensureOwnership(actor: AuthUser, id: string) {
    const entry = await this.prisma.overtimeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Lançamento não encontrado');
    if (entry.userId !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Lançamento de outro usuário');
    }
    return entry;
  }
}
