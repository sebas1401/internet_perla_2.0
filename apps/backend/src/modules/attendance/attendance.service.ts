import { Injectable } from '@nestjs/common';
import { AttendanceRecord } from './attendance-record.entity';
import { CheckDto } from './dto';
import { AttendanceRepository } from '../../repositories/attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(private repo: AttendanceRepository) {}
  list() { return this.repo.list(); }
  check(dto: CheckDto) { return this.repo.save(dto as Partial<AttendanceRecord>); }
}
