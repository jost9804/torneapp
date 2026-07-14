import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { RecordResultDto } from './dto/record-result.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Patch(':id/result')
  recordResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordResultDto,
  ) {
    return this.matches.recordResult(id, dto);
  }
}
