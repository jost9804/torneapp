import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { StandingsService } from './standings.service';

@Controller('tournaments/:tournamentId')
export class StandingsController {
  constructor(private readonly standings: StandingsService) {}

  @Get('standings')
  table(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.standings.standings(tournamentId);
  }

  @Get('top-scorers')
  topScorers(@Param('tournamentId', ParseUUIDPipe) tournamentId: string) {
    return this.standings.topScorers(tournamentId);
  }
}
