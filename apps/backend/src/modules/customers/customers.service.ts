import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import { CustomersRepository } from '../../repositories/customers.repository';

@Injectable()
export class CustomersService {
  constructor(private repo: CustomersRepository) {}
  findAll() { return this.repo.findAll(); }
  async findOne(id: string) { const c = await this.repo.findById(id); if (!c) throw new NotFoundException('Not found'); return c; }
  create(dto: CreateCustomerDto) { return this.repo.save(dto); }
  async update(id: string, dto: UpdateCustomerDto) { const c = await this.findOne(id); Object.assign(c, dto); return this.repo.save(c); }
  async remove(id: string) { const c = await this.findOne(id); await this.repo.remove(c); return { deleted: true }; }
}
