import { Injectable } from '@nestjs/common';
import { AttendanceRecord } from './attendance-record.entity';
import { CheckDto } from './dto';
import { AttendanceRepository } from '../../repositories/attendance.repository';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

@Injectable()
export class AttendanceService {
  constructor(private repo: AttendanceRepository, private rt: RealtimeGateway) {}
  list() { return this.repo.list(); }
  async check(dto: CheckDto) {
    const saved = await this.repo.save(dto as Partial<AttendanceRecord>);
    this.rt.broadcastToAdmins('attendance:created', saved);
    return saved;
  }
}
