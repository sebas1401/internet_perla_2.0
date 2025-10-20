import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PayrollAccrual } from '../modules/finance/payroll-accrual.entity';

@Injectable()
export class PayrollAccrualsRepository {
  constructor(@InjectRepository(PayrollAccrual) private repo: Repository<PayrollAccrual>) {}

  async listByDate(date: string) {
    return this.repo.find({ where: { date } });
  }

  async exists(date: string, userId: string) {
    const c = await this.repo.count({ where: { date, userId } });
    return c > 0;
  }

  async upsertMany(accruals: Array<Partial<PayrollAccrual>>) {
    if (!accruals.length) return [];
    // rely on unique(date,userId)
    await this.repo.upsert(accruals, ['date', 'userId']);
    return this.repo.find({ where: { date: accruals[0].date, userId: In(accruals.map(a => a.userId!)) } });
  }

  async sumForDate(date: string) {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount),0)', 'sum')
      .where('a.date = :date', { date })
      .getRawOne<{ sum: string }>();
    return parseFloat(rows?.sum || '0');
  }
}
