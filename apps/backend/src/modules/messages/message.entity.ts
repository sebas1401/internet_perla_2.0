import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  sender: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  recipient: User;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
