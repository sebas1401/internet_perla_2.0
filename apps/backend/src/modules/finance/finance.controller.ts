import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateDebtDto, CreateLoanDto, CreatePayrollItemDto, CreatePeriodDto, UpdateDebtBalanceDto, UpdateLoanBalanceDto, UpdatePeriodStatusDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get('periods') listPeriods() { return this.service.listPeriods(); }
  @Post('periods') @Roles('ADMIN') createPeriod(@Body() dto: CreatePeriodDto) { return this.service.createPeriod(dto); }
  @Patch('periods/:id/status') @Roles('ADMIN') updatePeriodStatus(@Param('id') id: string, @Body() dto: UpdatePeriodStatusDto) { return this.service.updatePeriodStatus(id, dto); }

  @Get('payroll-items') listPayrollItems() { return this.service.listPayrollItems(); }
  @Post('payroll-items') @Roles('ADMIN') addPayrollItem(@Body() dto: CreatePayrollItemDto) { return this.service.addPayrollItem(dto); }

  @Get('loans') listLoans() { return this.service.listLoans(); }
  @Post('loans') @Roles('ADMIN') createLoan(@Body() dto: CreateLoanDto) { return this.service.createLoan(dto); }
  @Patch('loans/:id/balance') @Roles('ADMIN') updateLoanBalance(@Param('id') id: string, @Body() dto: UpdateLoanBalanceDto) { return this.service.updateLoanBalance(id, dto); }

  @Get('debts') listDebts() { return this.service.listDebts(); }
  @Post('debts') @Roles('ADMIN') createDebt(@Body() dto: CreateDebtDto) { return this.service.createDebt(dto); }
  @Patch('debts/:id/balance') @Roles('ADMIN') updateDebtBalance(@Param('id') id: string, @Body() dto: UpdateDebtBalanceDto) { return this.service.updateDebtBalance(id, dto); }
}

