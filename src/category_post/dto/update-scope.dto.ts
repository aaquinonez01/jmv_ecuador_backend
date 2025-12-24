import { PartialType } from '@nestjs/mapped-types';
import { CreateScopeDto } from './create-scope.dto';

export class UpdateScopeDto extends PartialType(CreateScopeDto) {}
