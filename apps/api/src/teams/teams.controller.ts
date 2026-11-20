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
import { EnterTournamentDto } from '../clubs/dto/club.dto';
import { TeamsService } from './teams.service';

@Controller()
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  /** Tournament admins add the club right away; club admins file a request. */
  @Post('tournaments/:tournamentId/teams')
  @Authenticated()
  enter(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Body() dto: EnterTournamentDto,
  ) {
    return this.teams.enter(user, tournamentId, dto.clubId);
  }

  @Get('tournaments/:tournamentId/teams')
  findByTournament(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.teams.findByTournament(tournamentId);
  }

  @Get('tournaments/:tournamentId/entry-requests')
  @Authenticated()
  requests(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.teams.requests(user, tournamentId);
  }

  @Patch('entry-requests/:id/approve')
  @Authenticated()
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teams.approve(user, id);
  }

  @Delete('entry-requests/:id')
  @Authenticated()
  @HttpCode(204)
  dismiss(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teams.dismiss(user, id);
  }

  @Delete('teams/:id')
  @Authenticated()
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teams.remove(user, id);
  }
}
