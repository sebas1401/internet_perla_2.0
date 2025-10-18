import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto';
import { User } from '../users/user.entity';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(User) private users: Repository<User>,
    private rt: RealtimeGateway,
  ) {}

  async create(dto: CreateTaskDto) {
    const assignedTo = await this.users.findOne({ where: { id: dto.userId } });
    if (!assignedTo) throw new NotFoundException('User not found');
    const saved = await this.tasks.save(this.tasks.create({ title: dto.title, description: dto.description, assignedTo }));
    this.rt.emitToUser(assignedTo.id, 'task:created', saved);
    this.rt.broadcastToAdmins('task:created', saved);
    return saved;
  }

  listAll() { return this.tasks.find({ order: { createdAt: 'DESC' } }); }

  listForUser(userId: string) { return this.tasks.find({ where: { assignedTo: { id: userId } }, order: { createdAt: 'DESC' } }); }

  async complete(id: string, userId: string, proofUrl: string) {
    const t = await this.tasks.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Task not found');
    if (t.assignedTo?.id !== userId) throw new ForbiddenException('Not your task');
    t.status = 'COMPLETED';
    t.completedAt = new Date();
    t.proofUrl = proofUrl;
    const saved = await this.tasks.save(t);
    if (t.assignedTo?.id) this.rt.emitToUser(t.assignedTo.id, 'task:updated', saved);
    this.rt.broadcastToAdmins('task:updated', saved);
    return saved;
  }
}

