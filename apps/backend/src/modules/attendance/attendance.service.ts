import { Injectable } from '@nestjs/common';
import { AttendanceRecord } from './attendance-record.entity';
import { CheckDto } from './dto';
import { AttendanceRepository } from '../../repositories/attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(private repo: AttendanceRepository) {}
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

  async summary(name: string) {
    const all = await this.repo.list();
    const filtered = all.filter(a => a.name === name);
    const total = filtered.length;
    const last = filtered[0] || null;
    return { total, last };
  }
}
