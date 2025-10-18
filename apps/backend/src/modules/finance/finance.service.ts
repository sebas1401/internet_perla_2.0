import { Injectable, NotFoundException } from '@nestjs/common';
import { PayrollPeriod } from './payroll-period.entity';
import { PayrollItem } from './payroll-item.entity';
import { Loan } from './loan.entity';
import { InternalDebt } from './internal-debt.entity';
import { CreateDebtDto, CreateLoanDto, CreatePayrollItemDto, CreatePeriodDto, UpdateDebtBalanceDto, UpdateLoanBalanceDto, UpdatePeriodStatusDto } from './dto';
import { PayrollPeriodsRepository } from '../../repositories/payroll-periods.repository';
import { PayrollItemsRepository } from '../../repositories/payroll-items.repository';
import { LoansRepository } from '../../repositories/loans.repository';
import { DebtsRepository } from '../../repositories/debts.repository';

@Injectable()
export class FinanceService {
  constructor(
    private periods: PayrollPeriodsRepository,
    private items: PayrollItemsRepository,
    private loans: LoansRepository,
    private debts: DebtsRepository,
  ) {}

  createPeriod(dto: CreatePeriodDto) { return this.periods.save(dto as Partial<PayrollPeriod>); }
  listPeriods() { return this.periods.list(); }
  async updatePeriodStatus(id: string, dto: UpdatePeriodStatusDto) { const p = await this.periods.findById(id); if (!p) throw new NotFoundException(); (p as any).status = dto.status; return this.periods.save(p); }

  async addPayrollItem(dto: CreatePayrollItemDto) {
    const period = await this.periods.findById(dto.periodId); if (!period) throw new NotFoundException('Period not found');
    return this.items.save({ period, type: dto.type as any, amount: dto.amount, employeeName: dto.employeeName } as Partial<PayrollItem>);
  }
  listPayrollItems() { return this.items.list(); }

  createLoan(dto: CreateLoanDto) { return this.loans.save({ employeeName: dto.employeeName, total: dto.total, installments: dto.installments, balance: dto.total } as Partial<Loan>); }
  listLoans() { return this.loans.list(); }
  async updateLoanBalance(id: string, dto: UpdateLoanBalanceDto) { const l = await this.loans.findById(id); if (!l) throw new NotFoundException(); l.balance = dto.balance; return this.loans.save(l); }

  createDebt(dto: CreateDebtDto) { return this.debts.save({ employeeName: dto.employeeName, description: dto.description, amount: dto.amount, balance: dto.amount } as Partial<InternalDebt>); }
  listDebts() { return this.debts.list(); }
  async updateDebtBalance(id: string, dto: UpdateDebtBalanceDto) { const d = await this.debts.findById(id); if (!d) throw new NotFoundException(); if (dto.balance !== undefined) d.balance = dto.balance; return this.debts.save(d); }
}
