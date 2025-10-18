import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollPeriod } from './payroll-period.entity';
import { PayrollItem } from './payroll-item.entity';
import { Loan } from './loan.entity';
import { InternalDebt } from './internal-debt.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollPeriod, PayrollItem, Loan, InternalDebt])],
  providers: [FinanceService],
  controllers: [FinanceController],
})
export class FinanceModule {}

