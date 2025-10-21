import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateItemDto, UpdateItemDto, CreateWarehouseDto, MovementDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}
  @Get('items') listItems() { return this.service.listItems(); }
  @Post('items') @Roles('ADMIN') createItem(@Body() dto: CreateItemDto) { return this.service.createItem(dto); }
  @Patch('items/:id') @Roles('ADMIN') updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) { return this.service.updateItem(id, dto); }
  @Delete('items/:id') @Roles('ADMIN') removeItem(@Param('id') id: string) { return this.service.removeItem(id); }

  @Get('warehouses') listWarehouses() { return this.service.listWarehouses(); }
  @Post('warehouses') @Roles('ADMIN') createWarehouse(@Body() dto: CreateWarehouseDto) { return this.service.createWarehouse(dto); }

  @Get('stocks') listStocks() { return this.service.listStocks(); }
  @Get('movements') listMovements() { return this.service.listMovements(); }
  @Post('movements') move(@Body() dto: MovementDto) { return this.service.move(dto); }
}

