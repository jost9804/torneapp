import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions } from '../images/images';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';

@Controller()
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post('tournaments/:tournamentId/teams')
  @Authenticated()
  create(
    @CurrentUser() user: AuthUser,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teams.create(user, tournamentId, dto);
  }

  @Get('tournaments/:tournamentId/teams')
  findByTournament(
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
  ) {
    return this.teams.findByTournament(tournamentId);
  }

  @Put('teams/:id/crest')
  @Authenticated()
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadCrest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.teams.setCrest(user, id, file);
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
