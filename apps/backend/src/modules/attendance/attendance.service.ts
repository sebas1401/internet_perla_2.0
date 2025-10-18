import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { CheckDto } from './dto';

@Injectable()
export class AttendanceService {
  constructor(@InjectRepository(AttendanceRecord) private repo: Repository<AttendanceRecord>) {}
  list() { return this.repo.find({ order: { timestamp: 'DESC' } }); }
  check(dto: CheckDto) { return this.repo.save(this.repo.create(dto)); }
}

