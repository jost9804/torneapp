import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayersService } from './players.service';

@Controller()
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Post('teams/:teamId/players')
  create(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreatePlayerDto,
  ) {
    return this.players.create(teamId, dto);
  }

  @Get('teams/:teamId/players')
  findByTeam(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.players.findByTeam(teamId);
  }

  @Delete('players/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.players.remove(id);
  }
}
