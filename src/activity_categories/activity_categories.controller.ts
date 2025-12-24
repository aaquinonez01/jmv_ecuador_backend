import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ActivityCategoriesService } from './activity_categories.service';
import { CreateActivityCategoryDto } from './dto/create-activity-category.dto';
import { UpdateActivityCategoryDto } from './dto/update-activity-category.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';

@Controller('activity-categories')
export class ActivityCategoriesController {
  constructor(private readonly service: ActivityCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  create(@Body() dto: CreateActivityCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateActivityCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

