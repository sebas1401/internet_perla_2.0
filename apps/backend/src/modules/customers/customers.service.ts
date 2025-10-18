import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>) {}
  findAll() { return this.repo.find(); }
  async findOne(id: string) { const c = await this.repo.findOne({ where: { id } }); if (!c) throw new NotFoundException('Not found'); return c; }
  create(dto: CreateCustomerDto) { return this.repo.save(this.repo.create(dto)); }
  async update(id: string, dto: UpdateCustomerDto) { const c = await this.findOne(id); Object.assign(c, dto); return this.repo.save(c); }
  async remove(id: string) { const c = await this.findOne(id); await this.repo.remove(c); return { deleted: true }; }
}

