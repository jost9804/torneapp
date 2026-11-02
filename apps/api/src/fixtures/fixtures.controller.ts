import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { FixturesService } from './fixtures.service';

@Controller('tournaments/:tournamentId')
export class FixturesController {
  constructor(private readonly fixtures: FixturesService) {}

  @Post('fixture')
  @Authenticated()
  generate(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.fixtures.generate(user, tournamentId);
  }

  @Get('matches')
  findByTournament(
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.fixtures.findByTournament(tournamentId);
  }
}
