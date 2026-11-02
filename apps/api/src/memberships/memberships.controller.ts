import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import {
  ApproveMembershipDto,
  InviteMemberDto,
  JoinTournamentDto,
} from './dto/membership.dto';
import { MembershipsService } from './memberships.service';

@Controller()
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Post('tournaments/:tournamentId/join')
  @Authenticated()
  join(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Body() dto: JoinTournamentDto,
  ) {
    return this.memberships.join(user, tournamentId, dto);
  }

  @Post('tournaments/:tournamentId/members')
  @Authenticated()
  invite(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.memberships.invite(user, tournamentId, dto);
  }

  @Get('tournaments/:tournamentId/members')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.memberships.list(user, tournamentId);
  }

  @Patch('memberships/:id/approve')
  @Authenticated()
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveMembershipDto,
  ) {
    return this.memberships.approve(user, id, dto);
  }

  @Delete('memberships/:id')
  @Authenticated()
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.memberships.remove(user, id);
  }
}
