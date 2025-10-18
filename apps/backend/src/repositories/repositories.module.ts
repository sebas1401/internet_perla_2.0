import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/user.entity';
import { Customer } from '../modules/customers/customer.entity';
import { AttendanceRecord } from '../modules/attendance/attendance-record.entity';
import { InventoryItem } from '../modules/inventory/inventory-item.entity';
import { Warehouse } from '../modules/inventory/warehouse.entity';
import { InventoryStock } from '../modules/inventory/inventory-stock.entity';
import { InventoryMovement } from '../modules/inventory/inventory-movement.entity';
import { PayrollPeriod } from '../modules/finance/payroll-period.entity';
import { PayrollItem } from '../modules/finance/payroll-item.entity';
import { Loan } from '../modules/finance/loan.entity';
import { InternalDebt } from '../modules/finance/internal-debt.entity';
import { UsersRepository } from './users.repository';
import { CustomersRepository } from './customers.repository';
import { AttendanceRepository } from './attendance.repository';
import { InventoryItemsRepository } from './inventory-items.repository';
import { WarehousesRepository } from './warehouses.repository';
import { InventoryStocksRepository } from './inventory-stocks.repository';
import { InventoryMovementsRepository } from './inventory-movements.repository';
import { PayrollPeriodsRepository } from './payroll-periods.repository';
import { PayrollItemsRepository } from './payroll-items.repository';
import { LoansRepository } from './loans.repository';
import { DebtsRepository } from './debts.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Customer,
      AttendanceRecord,
      InventoryItem,
      Warehouse,
      InventoryStock,
      InventoryMovement,
      PayrollPeriod,
      PayrollItem,
      Loan,
      InternalDebt,
    ]),
  ],
  providers: [
    UsersRepository,
    CustomersRepository,
    AttendanceRepository,
    InventoryItemsRepository,
    WarehousesRepository,
    InventoryStocksRepository,
    InventoryMovementsRepository,
    PayrollPeriodsRepository,
    PayrollItemsRepository,
    LoansRepository,
    DebtsRepository,
  ],
  exports: [
    UsersRepository,
    CustomersRepository,
    AttendanceRepository,
    InventoryItemsRepository,
    WarehousesRepository,
    InventoryStocksRepository,
    InventoryMovementsRepository,
    PayrollPeriodsRepository,
    PayrollItemsRepository,
    LoansRepository,
    DebtsRepository,
  ],
})
export class RepositoriesModule {}
