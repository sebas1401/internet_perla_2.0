import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PayrollItemType, PayrollPeriodStatus } from '../../common/enums';

export class CreatePeriodDto {
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
}

export class UpdatePeriodStatusDto { @IsEnum(PayrollPeriodStatus) status: PayrollPeriodStatus; }

export class CreatePayrollItemDto {
  @IsString() periodId: string;
  @IsEnum(PayrollItemType) type: PayrollItemType;
  @IsNumber() amount: number;
  @IsString() employeeName: string;
}

export class CreateLoanDto { @IsString() employeeName: string; @IsNumber() total: number; @IsNumber() installments: number; }
export class UpdateLoanBalanceDto { @IsNumber() balance: number; }

export class CreateDebtDto { @IsString() employeeName: string; @IsString() description: string; @IsNumber() amount: number; }
export class UpdateDebtBalanceDto { @IsOptional() @IsNumber() balance?: number; }

