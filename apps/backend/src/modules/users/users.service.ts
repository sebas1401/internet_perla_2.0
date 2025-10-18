import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, RegisterDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findAll() { return this.repo.find(); }
  async findOne(id: string) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }
  findByEmail(email: string) { return this.repo.findOne({ where: { email } }); }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const count = await this.repo.count();
    const u = this.repo.create({ email: dto.email, passwordHash, name: dto.name, role: count === 0 ? 'ADMIN' as any : undefined });
    return this.repo.save(u);
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const u = this.repo.create({ email: dto.email, passwordHash, role: dto.role, name: dto.name });
    return this.repo.save(u);
  }

  async update(id: string, dto: UpdateUserDto) {
    const u = await this.findOne(id);
    if (dto.email) u.email = dto.email;
    if (dto.name) u.name = dto.name;
    if (dto.role) u.role = dto.role;
    if (dto.password) u.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.repo.save(u);
  }

  async remove(id: string) {
    const u = await this.findOne(id);
    await this.repo.remove(u);
    return { deleted: true };
  }
}
