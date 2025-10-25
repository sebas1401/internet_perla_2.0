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
      useFactory: (cfg: ConfigService) => {
        const databaseUrl = cfg.get('DATABASE_URL');
        if (databaseUrl) {
          // 🔹 Modo nube (Render)
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: cfg.get('DB_SYNC') === 'true',
            ssl: { rejectUnauthorized: false },
          };
        }
        // 🔹 Modo local (Docker)
        return {
          type: 'postgres',
          host: cfg.get('DB_HOST') || 'localhost',
          port: parseInt(cfg.get<string>('DB_PORT') ?? '5432', 10),
          username: cfg.get('DB_USERNAME') || 'postgres',
          password: cfg.get('DB_PASSWORD') || 'postgres',
          database: cfg.get('DB_DATABASE') || 'internetperla',
          autoLoadEntities: true,
          synchronize: cfg.get('DB_SYNC') === 'true',
        };
      },
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
