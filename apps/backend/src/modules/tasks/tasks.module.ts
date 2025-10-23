import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { User } from '../users/user.entity';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), RealtimeModule],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}

