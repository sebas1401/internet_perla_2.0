import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

@Entity()
@Unique(["date"])
export class CashDailySummary {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ type: "date" }) date: string; // YYYY-MM-DD
  @Column("decimal", { precision: 12, scale: 2, default: 0 }) incomes: number;
  @Column("decimal", { precision: 12, scale: 2, default: 0 }) expenses: number;
  @Column("decimal", { precision: 12, scale: 2, default: 0 }) balance: number;
  @CreateDateColumn() createdAt: Date;
  @Column({ nullable: true }) closedBy?: string; // email del admin
}
