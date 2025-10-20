import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  CashCutQueryDto,
  CloseDayDto,
  CreateCashEntryDto,
  CreateDebtDto,
  CreateLoanDto,
  CreatePayrollItemDto,
  CreatePeriodDto,
  DateRangeDto,
  UpdateDebtBalanceDto,
  UpdateLoanBalanceDto,
  UpdatePeriodStatusDto,
} from "./dto";
import { FinanceService } from "./finance.service";

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("finance")
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get("periods") listPeriods() {
    return this.service.listPeriods();
  }
  @Post("periods") @Roles("ADMIN") createPeriod(@Body() dto: CreatePeriodDto) {
    return this.service.createPeriod(dto);
  }
  @Patch("periods/:id/status") @Roles("ADMIN") updatePeriodStatus(
    @Param("id") id: string,
    @Body() dto: UpdatePeriodStatusDto
  ) {
    return this.service.updatePeriodStatus(id, dto);
  }

  @Get("payroll-items") listPayrollItems() {
    return this.service.listPayrollItems();
  }
  @Post("payroll-items") @Roles("ADMIN") addPayrollItem(
    @Body() dto: CreatePayrollItemDto
  ) {
    return this.service.addPayrollItem(dto);
  }

  @Get("loans") listLoans() {
    return this.service.listLoans();
  }
  @Post("loans") @Roles("ADMIN") createLoan(@Body() dto: CreateLoanDto) {
    return this.service.createLoan(dto);
  }
  @Patch("loans/:id/balance") @Roles("ADMIN") updateLoanBalance(
    @Param("id") id: string,
    @Body() dto: UpdateLoanBalanceDto
  ) {
    return this.service.updateLoanBalance(id, dto);
  }

  @Get("debts") listDebts() {
    return this.service.listDebts();
  }
  @Post("debts") @Roles("ADMIN") createDebt(@Body() dto: CreateDebtDto) {
    return this.service.createDebt(dto);
  }
  @Patch("debts/:id/balance") @Roles("ADMIN") updateDebtBalance(
    @Param("id") id: string,
    @Body() dto: UpdateDebtBalanceDto
  ) {
    return this.service.updateDebtBalance(id, dto);
  }

  // Corte de caja
  @Get("cash-cut") getCashCut(@Query() q: CashCutQueryDto, @Req() req: any) {
    return this.service.getCashCut(q, {
      userId: req?.user?.userId,
      role: req?.user?.role,
    });
  }
  @Post("cash-entry") addCashEntry(
    @Body() dto: CreateCashEntryDto,
    @Req() req: any
  ) {
    const user = req?.user || {};
    return this.service.addCashEntry(dto, user?.email, {
      userId: user?.userId,
      email: user?.email,
      name: user?.name,
      role: user?.role,
    });
  }

  // Resúmenes (ADMIN)
  @Get("cash-summaries")
  @Roles("ADMIN")
  summaries(@Query() q: DateRangeDto) {
    return this.service.listDailySummaries(q.from, q.to, q.userId);
  }
  @Post("cash-summaries/close-day")
  @Roles("ADMIN")
  closeDay(@Body() dto: CloseDayDto, @Req() req: any) {
    return this.service.persistDailySummary(dto.date, req?.user?.email, dto.includeUserIds);
  }

  // Sueldos del día (ADMIN)
  @Get("daily-salaries")
  @Roles("ADMIN")
  listDailySalaries(@Query("date") date: string) {
    return this.service.getDailySalaryCandidates(date);
  }

  @Get("daily-salaries/accruals")
  @Roles("ADMIN")
  listDailySalaryAccruals(@Query("date") date: string) {
    return this.service.listSalaryAccruals(date);
  }
}
