import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollPeriod } from './payroll-period.entity';
import { PayrollItem } from './payroll-item.entity';
import { Loan } from './loan.entity';
import { InternalDebt } from './internal-debt.entity';
import { CreateDebtDto, CreateLoanDto, CreatePayrollItemDto, CreatePeriodDto, UpdateDebtBalanceDto, UpdateLoanBalanceDto, UpdatePeriodStatusDto } from './dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(PayrollPeriod) private periods: Repository<PayrollPeriod>,
    @InjectRepository(PayrollItem) private items: Repository<PayrollItem>,
    @InjectRepository(Loan) private loans: Repository<Loan>,
    @InjectRepository(InternalDebt) private debts: Repository<InternalDebt>,
  ) {}

  createPeriod(dto: CreatePeriodDto) { return this.periods.save(this.periods.create(dto)); }
  listPeriods() { return this.periods.find(); }
  async updatePeriodStatus(id: string, dto: UpdatePeriodStatusDto) { const p = await this.periods.findOne({ where: { id } }); if (!p) throw new NotFoundException(); p.status = dto.status; return this.periods.save(p); }

  async addPayrollItem(dto: CreatePayrollItemDto) {
    const period = await this.periods.findOne({ where: { id: dto.periodId } }); if (!period) throw new NotFoundException('Period not found');
    const item = this.items.create({ period, type: dto.type, amount: dto.amount, employeeName: dto.employeeName });
    return this.items.save(item);
  }
  listPayrollItems() { return this.items.find(); }

  createLoan(dto: CreateLoanDto) { return this.loans.save(this.loans.create({ employeeName: dto.employeeName, total: dto.total, installments: dto.installments, balance: dto.total })); }
  listLoans() { return this.loans.find(); }
  async updateLoanBalance(id: string, dto: UpdateLoanBalanceDto) { const l = await this.loans.findOne({ where: { id } }); if (!l) throw new NotFoundException(); l.balance = dto.balance; return this.loans.save(l); }

  createDebt(dto: CreateDebtDto) { return this.debts.save(this.debts.create({ employeeName: dto.employeeName, description: dto.description, amount: dto.amount, balance: dto.amount })); }
  listDebts() { return this.debts.find(); }
  async updateDebtBalance(id: string, dto: UpdateDebtBalanceDto) { const d = await this.debts.findOne({ where: { id } }); if (!d) throw new NotFoundException(); if (dto.balance !== undefined) d.balance = dto.balance; return this.debts.save(d); }
}

