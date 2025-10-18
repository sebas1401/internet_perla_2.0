import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { join } from 'path';
import { SendMessageDto } from './dto';
import { MessagesService } from './messages.service';

// image uploads removed; text-only messaging

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private service: MessagesService) {
    // no-op
  }

  @Post()
  async send(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.service.send(req.user.userId, dto.recipientId, dto.content);
  }

  @Get('contacts')
  contacts(@Req() req: any) { return this.service.contactsFor(req.user.userId); }

  @Get('thread/:userId')
  thread(@Req() req: any, @Param('userId') other: string) { return this.service.thread(req.user.userId, other); }
}
