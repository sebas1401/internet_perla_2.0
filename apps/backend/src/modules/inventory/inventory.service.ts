import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryItemsRepository } from '../../repositories/inventory-items.repository';
import { WarehousesRepository } from '../../repositories/warehouses.repository';
import { InventoryStocksRepository } from '../../repositories/inventory-stocks.repository';
import { InventoryMovementsRepository } from '../../repositories/inventory-movements.repository';
import { InventoryItem } from './inventory-item.entity';
import { CreateItemDto, UpdateItemDto, CreateWarehouseDto, MovementDto } from './dto';
import { Warehouse } from './warehouse.entity';
import { InventoryStock } from './inventory-stock.entity';
import { InventoryMovement } from './inventory-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    private items: InventoryItemsRepository,
    private warehouses: WarehousesRepository,
    private stocks: InventoryStocksRepository,
    private movements: InventoryMovementsRepository,
  ) {}

  // Items
  createItem(dto: CreateItemDto) { return this.items.save(dto); }
  listItems() { return this.items.list(); }
  async updateItem(id: string, dto: UpdateItemDto) { const item = await this.items.findById(id); if (!item) throw new NotFoundException(); Object.assign(item, dto); return this.items.save(item); }
  async removeItem(id: string) { const item = await this.items.findById(id); if (!item) throw new NotFoundException(); await this.items.remove(item); return { deleted: true }; }

  // Warehouses
  createWarehouse(dto: CreateWarehouseDto) { return this.warehouses.save(dto); }
  listWarehouses() { return this.warehouses.list(); }

  private async getOrCreateStock(itemId: string, warehouseId: string) {
    let stock = await this.stocks.findByItemAndWarehouse(itemId, warehouseId);
    if (!stock) {
      const item = await this.items.findById(itemId);
      const warehouse = await this.warehouses.findById(warehouseId);
      if (!item || !warehouse) throw new NotFoundException('Item or warehouse not found');
      stock = await this.stocks.save({ item, warehouse, quantity: 0 } as any);
    }
    return stock;
  }

  async move(dto: MovementDto) {
    const item = await this.items.findById(dto.itemId);
    if (!item) throw new NotFoundException('Item not found');
    if (!dto.warehouseId) throw new BadRequestException('warehouseId required');
    const stock = await this.getOrCreateStock(dto.itemId, dto.warehouseId);
    if (dto.type === 'IN') stock.quantity += dto.quantity; else {
      if (stock.quantity < dto.quantity) throw new BadRequestException('Insufficient stock');
      stock.quantity -= dto.quantity;
    }
    await this.stocks.save(stock);
    return this.movements.save({ item, type: dto.type, quantity: dto.quantity, note: dto.note } as any);
  }

  listStocks() { return this.stocks.list(); }
  listMovements() { return this.movements.list(); }
}
