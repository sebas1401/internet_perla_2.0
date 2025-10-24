import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { HealthController } from "./health.controller";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { UsersModule } from "./modules/users/users.module";
import { RepositoriesModule } from "./repositories/repositories.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
    }),
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    type: 'postgres',
    url: cfg.get('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: cfg.get('DB_SYNC') === 'true',
    ssl: { rejectUnauthorized: false },
  }),
}),

    AuthModule,
    RepositoriesModule,
    UsersModule,
    CustomersModule,
    AttendanceModule,
    InventoryModule,
    FinanceModule,
    MessagesModule,
  TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
