import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';

const storage = diskStorage({
  destination: (req, file, cb) => cb(null, process.cwd() + '/uploads'),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  },
});

@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateTaskDto) { return this.service.create(dto); }

  @Get()
  @Roles('ADMIN')
  listAll() { return this.service.listAll(); }

  @Get('mine')
  mine(@Req() req: any) { return this.service.listForUser(req.user.userId); }

  @Patch(':id/complete')
  @UseInterceptors(FileInterceptor('proof', { storage }))
  complete(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const url = file ? `/uploads/${file.filename}` : '';
    return this.service.complete(id, req.user.userId, url);
  }
}

