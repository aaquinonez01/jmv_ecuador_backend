import { PartialType } from '@nestjs/mapped-types';
import { CreateAsesorDto } from './create-asesor.dto';

export class UpdateAsesorDto extends PartialType(CreateAsesorDto) {}
