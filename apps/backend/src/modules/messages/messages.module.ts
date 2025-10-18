import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { User } from '../users/user.entity';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User]), RealtimeModule],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
