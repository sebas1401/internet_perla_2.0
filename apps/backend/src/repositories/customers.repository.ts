import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../modules/customers/customer.entity';

@Injectable()
export class CustomersRepository {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>) {}
  findAll() { return this.repo.find(); }
  findById(id: string) { return this.repo.findOne({ where: { id } }); }
  save(entity: Partial<Customer>) { return this.repo.save(entity); }
  remove(entity: Customer) { return this.repo.remove(entity); }
}

