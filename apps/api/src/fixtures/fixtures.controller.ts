import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { FixturesService } from './fixtures.service';

@Controller('tournaments/:tournamentId')
export class FixturesController {
  constructor(private readonly fixtures: FixturesService) {}

  @Post('fixture')
  generate(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.fixtures.generate(tournamentId);
  }

  @Get('matches')
  findByTournament(
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.fixtures.findByTournament(tournamentId);
  }
}
