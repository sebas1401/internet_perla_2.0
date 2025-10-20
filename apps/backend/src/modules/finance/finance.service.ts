import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { CashDailySummaryRepository } from "../../repositories/cash-daily-summary.repository";
import { CashEntriesRepository } from "../../repositories/cash-entries.repository";
import { PayrollAccrualsRepository } from "../../repositories/payroll-accruals.repository";
import { UsersRepository } from "../../repositories/users.repository";
import { DebtsRepository } from "../../repositories/debts.repository";
import { LoansRepository } from "../../repositories/loans.repository";
import { PayrollItemsRepository } from "../../repositories/payroll-items.repository";
import { PayrollPeriodsRepository } from "../../repositories/payroll-periods.repository";
import { CashEntry } from "./cash-entry.entity";
import {
  CashCutQueryDto,
  CreateCashEntryDto,
  CreateDebtDto,
  CreateLoanDto,
  CreatePayrollItemDto,
  CreatePeriodDto,
  UpdateDebtBalanceDto,
  UpdateLoanBalanceDto,
  UpdatePeriodStatusDto,
} from "./dto";
import { InternalDebt } from "./internal-debt.entity";
import { Loan } from "./loan.entity";
import { PayrollItem } from "./payroll-item.entity";
import { PayrollPeriod } from "./payroll-period.entity";

@Injectable()
export class FinanceService {
  constructor(
    private periods: PayrollPeriodsRepository,
    private items: PayrollItemsRepository,
    private loans: LoansRepository,
    private debts: DebtsRepository,
    private cash: CashEntriesRepository,
    private cashSummary: CashDailySummaryRepository,
    private payrollAccruals: PayrollAccrualsRepository,
    private users: UsersRepository,
    private realtime: RealtimeGateway
  ) {}

  createPeriod(dto: CreatePeriodDto) {
    return this.periods.save(dto as Partial<PayrollPeriod>);
  }
  listPeriods() {
    return this.periods.list();
  }
  async updatePeriodStatus(id: string, dto: UpdatePeriodStatusDto) {
    const p = await this.periods.findById(id);
    if (!p) throw new NotFoundException();
    (p as any).status = dto.status;
    return this.periods.save(p);
  }

  async addPayrollItem(dto: CreatePayrollItemDto) {
    const period = await this.periods.findById(dto.periodId);
    if (!period) throw new NotFoundException("Period not found");
    return this.items.save({
      period,
      type: dto.type as any,
      amount: dto.amount,
      employeeName: dto.employeeName,
    } as Partial<PayrollItem>);
  }
  listPayrollItems() {
    return this.items.list();
  }

  createLoan(dto: CreateLoanDto) {
    return this.loans.save({
      employeeName: dto.employeeName,
      total: dto.total,
      installments: dto.installments,
      balance: dto.total,
    } as Partial<Loan>);
  }
  listLoans() {
    return this.loans.list();
  }
  async updateLoanBalance(id: string, dto: UpdateLoanBalanceDto) {
    const l = await this.loans.findById(id);
    if (!l) throw new NotFoundException();
    l.balance = dto.balance;
    return this.loans.save(l);
  }

  createDebt(dto: CreateDebtDto) {
    return this.debts.save({
      employeeName: dto.employeeName,
      description: dto.description,
      amount: dto.amount,
      balance: dto.amount,
    } as Partial<InternalDebt>);
  }
  listDebts() {
    return this.debts.list();
  }
  async updateDebtBalance(id: string, dto: UpdateDebtBalanceDto) {
    const d = await this.debts.findById(id);
    if (!d) throw new NotFoundException();
    if (dto.balance !== undefined) d.balance = dto.balance;
    return this.debts.save(d);
  }

  // Cash cut (corte de caja)
  async addCashEntry(
    dto: CreateCashEntryDto,
    createdBy?: string,
    creator?: { userId?: string; email?: string; name?: string; role?: string }
  ) {
    // Si el día está marcado como cerrado, bloquear nuevos movimientos
    const existingSummary = await this.cashSummary.findByDate(dto.entryDate);
    if (existingSummary?.closedBy) {
      throw new BadRequestException(
        "El día está cerrado. No se pueden registrar nuevos movimientos."
      );
    }
    const entity: Partial<CashEntry> = {
      entryDate: dto.entryDate,
      type: dto.type,
      description: dto.description,
      amount: dto.amount,
      createdBy: creator?.email || createdBy,
      createdById: creator?.userId,
      createdByName: creator?.name,
    };
    const saved = await this.cash.save(entity);
    // actualizar resumen del día del creador sin marcar cierre
    const summary = await this.persistDailySummary(dto.entryDate);
    // realtime: notificar a todos (usuarios y admins)
    this.realtime.broadcastAll("cash:entry-added", {
      date: dto.entryDate,
      entry: saved,
      summary,
    });
    return saved;
  }

  async getCashCut(
    { date, userId }: CashCutQueryDto,
    reqUser?: { userId: string; role?: string }
  ) {
    // Aislar por usuario: si no es ADMIN, forzar su propio userId
    const effectiveUserId =
      reqUser?.role === "ADMIN" ? userId : reqUser?.userId;
    const entries = await this.cash.listByDate(date, effectiveUserId);
    const summary = await this.cashSummary.findByDate(date);
    const toNum = (x: any) => (typeof x === "string" ? parseFloat(x) : x || 0);
    const totals = entries.reduce(
      (acc, e) => {
        const amt = toNum(e.amount);
        if (e.type === "INCOME") acc.incomes += amt;
        else acc.expenses += amt;
        return acc;
      },
      { incomes: 0, expenses: 0 }
    );
    const result = {
      date,
      incomes: totals.incomes,
      expenses: totals.expenses,
      balance: totals.incomes - totals.expenses,
    };
    return { ...result, entries, closedBy: summary?.closedBy };
  }

  // Persistir resumen diario (idempotente por fecha)
  async persistDailySummary(date: string, closedBy?: string, includeUserIds?: string[]) {
    // 1) compute current totals from cash entries
    const { incomes, expenses } = await this.getCashCut({ date });

    // 2) if closing, create salary accruals for candidates (idempotent)
    if (closedBy) {
      const candidates = await this.getDailySalaryCandidates(date);
      let toInclude = candidates;
      if (Array.isArray(includeUserIds) && includeUserIds.length) {
        const set = new Set(includeUserIds);
        toInclude = candidates.filter((c) => set.has(c.userId));
      }
      const accruals = toInclude
        .filter((c) => (c.dailySalary || 0) > 0)
        .map((c) => ({ date, userId: c.userId, userName: c.userName, amount: c.dailySalary!, description: "Sueldo diario" }));
      await this.payrollAccruals.upsertMany(accruals);
    }

    // 3) re-calc with salaries included as expenses
    const salaries = await this.payrollAccruals.sumForDate(date);
    const finalExpenses = expenses + salaries;
    const finalBalance = incomes - finalExpenses;

    // 4) upsert daily summary snapshot
    const existing = await this.cashSummary.findByDate(date);
    const finalClosedBy = closedBy ?? existing?.closedBy;
    const saved = await this.cashSummary.upsertForDate(date, {
      incomes,
      expenses: finalExpenses,
      balance: finalBalance,
      closedBy: finalClosedBy,
    });
    if (closedBy) {
      this.realtime.broadcastAll("cash:day-closed", { date, summary: saved, closedBy });
    }
    return saved;
  }

  // Usuarios con movimientos de caja en la fecha y su sueldo diario
  async getDailySalaryCandidates(date: string): Promise<Array<{ userId: string; userName: string; dailySalary: number }>> {
    // distinct createdById from cash entries of that date
    const entries = await this.cash.listByDate(date);
    const ids = Array.from(new Set(entries.map((e) => e.createdById).filter(Boolean))) as string[];
    if (ids.length === 0) return [];
    const users = await Promise.all(ids.map((id) => this.users.findById(id)));
    return users
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({ userId: u.id, userName: u.name || u.email, dailySalary: Number(u.dailySalary || 0) }));
  }

  async listSalaryAccruals(date: string) {
    return this.payrollAccruals.listByDate(date);
  }

  // Listar resúmenes por rango de fechas, opcionalmente por usuario (ADMIN)
  async listDailySummaries(from: string, to: string, userId?: string) {
    if (userId) {
      // compute per-user aggregates from entries to respect isolation
      const rows = await this.cash.aggregateByDateRange(from, to, userId);
      // enrich with closedBy from stored summary if exists
      const summaries = await this.cashSummary.listByDateRange(from, to);
      const byDate = new Map(summaries.map((s) => [s.date, s] as const));
      return rows.map((r) => ({
        id: byDate.get(r.date)?.id,
        date: r.date,
        incomes: r.incomes,
        expenses: r.expenses,
        balance: r.balance,
        createdAt: byDate.get(r.date)?.createdAt,
        closedBy: byDate.get(r.date)?.closedBy,
      }));
    }
    // default: global summaries from snapshot table
    return this.cashSummary.listByDateRange(from, to);
  }
}
