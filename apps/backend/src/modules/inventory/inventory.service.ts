import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { CreateItemDto, UpdateItemDto, CreateWarehouseDto, MovementDto } from './dto';
import { Warehouse } from './warehouse.entity';
import { InventoryStock } from './inventory-stock.entity';
import { InventoryMovement } from './inventory-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private items: Repository<InventoryItem>,
    @InjectRepository(Warehouse) private warehouses: Repository<Warehouse>,
    @InjectRepository(InventoryStock) private stocks: Repository<InventoryStock>,
    @InjectRepository(InventoryMovement) private movements: Repository<InventoryMovement>,
  ) {}

  // Items
  createItem(dto: CreateItemDto) { return this.items.save(this.items.create(dto)); }
  listItems() { return this.items.find(); }
  async updateItem(id: string, dto: UpdateItemDto) { const item = await this.items.findOne({ where: { id } }); if (!item) throw new NotFoundException(); Object.assign(item, dto); return this.items.save(item); }
  async removeItem(id: string) { const item = await this.items.findOne({ where: { id } }); if (!item) throw new NotFoundException(); await this.items.remove(item); return { deleted: true }; }

  // Warehouses
  createWarehouse(dto: CreateWarehouseDto) { return this.warehouses.save(this.warehouses.create(dto)); }
  listWarehouses() { return this.warehouses.find(); }

  private async getOrCreateStock(itemId: string, warehouseId: string) {
    let stock = await this.stocks.findOne({ where: { item: { id: itemId }, warehouse: { id: warehouseId } } });
    if (!stock) {
      const item = await this.items.findOne({ where: { id: itemId } });
      const warehouse = await this.warehouses.findOne({ where: { id: warehouseId } });
      if (!item || !warehouse) throw new NotFoundException('Item or warehouse not found');
      stock = this.stocks.create({ item, warehouse, quantity: 0 });
      stock = await this.stocks.save(stock);
    }
    return stock;
  }

  async move(dto: MovementDto) {
    const item = await this.items.findOne({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (!dto.warehouseId) throw new BadRequestException('warehouseId required');
    const stock = await this.getOrCreateStock(dto.itemId, dto.warehouseId);
    if (dto.type === 'IN') stock.quantity += dto.quantity; else {
      if (stock.quantity < dto.quantity) throw new BadRequestException('Insufficient stock');
      stock.quantity -= dto.quantity;
    }
    await this.stocks.save(stock);
    const movement = this.movements.create({ item, type: dto.type, quantity: dto.quantity, note: dto.note });
    return this.movements.save(movement);
  }

  listStocks() { return this.stocks.find(); }
  listMovements() { return this.movements.find({ order: { timestamp: 'DESC' } }); }
}

