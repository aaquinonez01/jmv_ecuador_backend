import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import {
  AdjustPointsDto,
  ListMembersDto,
  MemberRequestDto,
  PageDto,
  ReviewMemberDto,
  UpdateRulesDto,
} from './dto/points.dto';
import { PointsService } from './points.service';

// Puntos JMV: se ganan en la app y se canjean (fase 4) en lo que ofrezca el Consejo Nacional
@Controller('points')
export class PointsController {
  constructor(private readonly service: PointsService) {}

  // ── App ──

  @Get('me')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  mine(@GetUser() user: User, @Query() q: PageDto) {
    return this.service.mine(user.id!, q.page);
  }

  /** Cómo se ganan puntos (para mostrarlo en la app) */
  @Get('rules')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  rules() {
    return this.service.getRules();
  }

  @Post('member-request')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  memberRequest(@GetUser() user: User, @Body() dto: MemberRequestDto) {
    return this.service.requestMembership(user.id!, dto);
  }

  // ── Admin ──

  @Get('admin/members')
  @Auth(ValidRoles.ADMIN)
  members(@Query() q: ListMembersDto) {
    return this.service.listMembers(q);
  }

  @Patch('admin/members/:id')
  @Auth(ValidRoles.ADMIN)
  review(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewMemberDto) {
    return this.service.reviewMember(id, dto);
  }

  @Get('admin/members/:id/transactions')
  @Auth(ValidRoles.ADMIN)
  memberTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PageDto,
  ) {
    return this.service.userTransactions(id, q.page);
  }

  @Post('admin/members/:id/adjust')
  @Auth(ValidRoles.ADMIN)
  adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustPointsDto,
    @GetUser() admin: User,
  ) {
    return this.service.adjust(id, dto, admin.id!);
  }

  @Get('admin/rules')
  @Auth(ValidRoles.ADMIN)
  adminRules() {
    return this.service.getRules();
  }

  @Put('admin/rules')
  @Auth(ValidRoles.ADMIN)
  updateRules(@Body() dto: UpdateRulesDto) {
    return this.service.updateRules(dto);
  }
}
