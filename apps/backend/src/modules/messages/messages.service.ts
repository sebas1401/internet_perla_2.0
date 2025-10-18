import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { User } from '../users/user.entity';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    @InjectRepository(User) private users: Repository<User>,
    private rt: RealtimeGateway,
  ) {}

  async send(senderId: string, recipientId: string, content?: string, imageUrl?: string) {
    const [sender, recipient] = await Promise.all([
      this.users.findOne({ where: { id: senderId } }),
      this.users.findOne({ where: { id: recipientId } }),
    ]);
    if (!sender) throw new NotFoundException('Sender not found');
    if (!recipient) throw new NotFoundException('Recipient not found');
    const msg = this.messages.create({ sender, recipient, content: content || null, imageUrl: imageUrl || null });
    const saved = await this.messages.save(msg);
    this.rt.emitToUser(recipient.id, 'message:created', saved);
    this.rt.emitToUser(sender.id, 'message:created', saved);
    return saved;
  }

  async thread(userAId: string, userBId: string) {
    return this.messages.find({
      where: [
        { sender: { id: userAId }, recipient: { id: userBId } },
        { sender: { id: userBId }, recipient: { id: userAId } },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async contactsFor(userId: string) {
    // Distinct set of users who have exchanged messages with current user
    const rows = await this.messages.createQueryBuilder('m')
      .leftJoin('m.sender', 's')
      .leftJoin('m.recipient', 'r')
      .where('s.id = :id OR r.id = :id', { id: userId })
      .select([
        "CASE WHEN s.id = :id THEN r.id ELSE s.id END AS id",
        "CASE WHEN s.id = :id THEN r.email ELSE s.email END AS email",
        "CASE WHEN s.id = :id THEN r.name ELSE s.name END AS name",
        "MAX(m.\"createdAt\") AS lastAt",
      ])
      .groupBy('CASE WHEN s.id = :id THEN r.id ELSE s.id END')
      .addGroupBy('CASE WHEN s.id = :id THEN r.email ELSE s.email END')
      .addGroupBy('CASE WHEN s.id = :id THEN r.name ELSE s.name END')
      .orderBy('lastAt', 'DESC')
      .getRawMany();
    const base: { id: string; email: string; name?: string; lastAt?: any }[] = rows.map((r: any) => ({ id: r.id, email: r.email, name: r.name, lastAt: r.lastat || r.lastAt }));
    // If requester is USER, include all ADMINs even if no prior messages
    const me = await this.users.findOne({ where: { id: userId } });
    if (me) {
      const others = await this.users.find();
      others
        .filter(u => u.id !== userId)
        .forEach(u => { if (!base.find(b => b.id === u.id)) base.push({ id: u.id, email: u.email, name: u.name, lastAt: null }); });
    }
    return base;
  }
}
