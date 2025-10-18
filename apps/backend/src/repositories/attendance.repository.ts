import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../modules/attendance/attendance-record.entity';

@Injectable()
export class AttendanceRepository {
  constructor(@InjectRepository(AttendanceRecord) private repo: Repository<AttendanceRecord>) {}
  list() { return this.repo.find({ order: { timestamp: 'DESC' } }); }
  save(entity: Partial<AttendanceRecord>) { return this.repo.save(entity); }
}

