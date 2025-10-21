import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckDto } from './dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}
  @Get() list() { return this.service.list(); }
  @Post('check') check(@Body() dto: CheckDto) { return this.service.check(dto); }
  @Get('summary') summary(@Query('name') name?: string) {
    if (!name) throw new BadRequestException('name is required');
    return this.service.summary(name);
  }
}

