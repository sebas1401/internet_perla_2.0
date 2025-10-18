import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckDto } from './dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}
  @Get() list() { return this.service.list(); }
  @Post('check') check(@Body() dto: CheckDto) { return this.service.check(dto); }
}

