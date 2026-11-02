import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { AssignRefereeDto, RecordResultDto } from './dto/record-result.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Patch(':id/result')
  @Authenticated()
  recordResult(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordResultDto,
  ) {
    return this.matches.recordResult(user, id, dto);
  }

  @Patch(':id/referee')
  @Authenticated()
  assignReferee(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRefereeDto,
  ) {
    return this.matches.assignReferee(user, id, dto);
  }
}
