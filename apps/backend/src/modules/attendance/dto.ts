import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceType } from '../../common/enums';

export class CheckDto {
  @IsString() name: string;
  @IsEnum(AttendanceType) tipo: AttendanceType;
  @IsOptional() @IsString() note?: string;
}

