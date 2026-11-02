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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { CreatePlayerDto } from './dto/create-player.dto';
import { ReviewPlayerRequestDto, UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

@Controller()
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  /** 201 when the player joins the roster, 202 when it waits for the admin */
  @Post('teams/:teamId/players')
  @Authenticated()
  async create(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: CreatePlayerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.players.create(user, teamId, dto);
    if (result.status === 'PENDING') res.status(202);
    return result;
  }

  @Get('teams/:teamId/players')
  findByTeam(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.players.findByTeam(teamId);
  }

  @Patch('players/:id')
  @Authenticated()
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.players.update(user, id, dto);
  }

  @Delete('players/:id')
  @Authenticated()
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.players.remove(user, id);
  }

  @Get('tournaments/:tournamentId/player-requests')
  @Authenticated()
  listRequests(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.players.listRequests(user, tournamentId);
  }

  @Patch('player-requests/:id')
  @Authenticated()
  reviewRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPlayerRequestDto,
  ) {
    return this.players.reviewRequest(user, id, dto);
  }
}
