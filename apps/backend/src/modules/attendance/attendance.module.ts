import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord]), RealtimeModule],
  providers: [AttendanceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}

