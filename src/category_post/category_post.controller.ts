import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CategoryPostService } from './category_post.service';
import { CreateScopeDto } from './dto/create-scope.dto';
import { UpdateScopeDto } from './dto/update-scope.dto';
import { CreateActivityTypeDto } from './dto/activity-type.entity.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';
import { CreateSubtypeDto } from './dto/create-sub-type.dto';
import { UpdateSubtypeDto } from './dto/update-sub-type.dto';

@Controller('category-post')
export class CategoryPostController {
  constructor(private readonly categoryPostService: CategoryPostService) {}

  @Post('scope')
  createScope(@Body() createScopeDto: CreateScopeDto) {
    return this.categoryPostService.createScope(createScopeDto);
  }

  @Get('scopes')
  findAllScopes() {
    return this.categoryPostService.findAllScopes();
  }

  @Get('scopes/:id')
  findOneScope(@Param('id') id: string) {
    return this.categoryPostService.findOneScope(id);
  }

  @Patch('scopes/:id')
  update(@Param('id') id: string, @Body() updateScopeDto: UpdateScopeDto) {
    return this.categoryPostService.updateScope(id, updateScopeDto);
  }

  @Delete('scopes/:id')
  removeScope(@Param('id') id: string) {
    return this.categoryPostService.removeScope(id);
  }

  @Post('activity-type')
  createActivityType(@Body() createActivityTypeDto: CreateActivityTypeDto) {
    return this.categoryPostService.createActivityType(createActivityTypeDto);
  }

  @Get('activity-types')
  findAllActivityTypes() {
    return this.categoryPostService.findAllActivityTypes();
  }

  @Get('activity-types/:id')
  findOneActivityType(@Param('id') id: string) {
    return this.categoryPostService.findOneActivityType(id);
  }
  @Patch('activity-types/:id')
  updateActivityType(
    @Param('id') id: string,
    @Body() updateActivityTypeDto: UpdateActivityTypeDto,
  ) {
    return this.categoryPostService.updateActivityType(
      id,
      updateActivityTypeDto,
    );
  }

  @Delete('activity-types/:id')
  removeActivityType(@Param('id') id: string) {
    return this.categoryPostService.removeActivityType(id);
  }

  @Post('subtype')
  createSubtype(@Body() createSubtypeDto: CreateSubtypeDto) {
    return this.categoryPostService.createSubtype(createSubtypeDto);
  }

  @Get('subtypes')
  findAllSubtypes() {
    return this.categoryPostService.findAllSubtypes();
  }

  @Get('subtypes/:id')
  findOneSubtype(@Param('id') id: string) {
    return this.categoryPostService.findOneSubtype(id);
  }

  @Get('activity-types/:id/subtypes')
  findAllSubtypesByActivityType(@Param('id') id: string) {
    return this.categoryPostService.findAllSubtypesByActivityType(id);
  }
  @Patch('subtypes/:id')
  updateSubtype(
    @Param('id') id: string,
    @Body() updateSubtypeDto: UpdateSubtypeDto,
  ) {
    return this.categoryPostService.updateSubtype(id, updateSubtypeDto);
  }
  @Delete('subtypes/:id')
  removeSubtype(@Param('id') id: string) {
    return this.categoryPostService.removeSubtype(id);
  }

  @Get('all')
  findAllCategories() {
    return this.categoryPostService.findAllCategories();
  }
}
