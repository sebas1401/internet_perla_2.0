import { Injectable } from '@nestjs/common';
import { AttendanceRecord } from './attendance-record.entity';
import { CheckDto } from './dto';
import { AttendanceRepository } from '../../repositories/attendance.repository';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

@Injectable()
export class AttendanceService {
  constructor(private repo: AttendanceRepository, private rt: RealtimeGateway) {}
  list() { return this.repo.list(); }
  check(dto: CheckDto) { return this.repo.save(dto as Partial<AttendanceRecord>); }
  async summary(name: string) {
    const records = await this.repo.list();
    const filtered = records.filter(r => r.name === name);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = filtered.filter(r => new Date(r.timestamp) >= today);
    return {
      name,
      total: filtered.length,
      todayRecords: todayRecords.length,
      checks: filtered,
    };
  }
}
