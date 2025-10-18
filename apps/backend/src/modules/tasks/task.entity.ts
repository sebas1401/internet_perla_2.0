import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type TaskStatus = 'PENDING' | 'COMPLETED';

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() title: string;
  @Column('text') description: string;
  @ManyToOne(() => User, { eager: true }) assignedTo: User;
  @Column({ type: 'enum', enum: ['PENDING','COMPLETED'], default: 'PENDING' }) status: TaskStatus;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) completedAt?: Date | null;
  @Column({ type: 'text', nullable: true }) proofUrl?: string | null;
}
