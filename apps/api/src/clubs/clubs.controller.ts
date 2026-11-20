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
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { imageUploadOptions } from '../images/images';
import { CreatePlayerDto } from '../players/dto/create-player.dto';
import { ClubsService } from './clubs.service';
import { AddClubMemberDto, ClubNameDto } from './dto/club.dto';

/** Teams that live on their own and play many tournaments ("equipos" in the app). */
@Controller()
export class ClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Post('clubs')
  @Authenticated()
  create(@CurrentUser() user: AuthUser, @Body() dto: ClubNameDto) {
    return this.clubs.create(user, dto.name);
  }

  /** `mine=true` lists the viewer's clubs; `q` searches by name */
  @Get('clubs')
  list(
    @CurrentUser() user: AuthUser | undefined,
    @Query('mine') mine?: string,
    @Query('q') q?: string,
  ) {
    return this.clubs.list(user, { mine: mine === 'true', q });
  }

  @Get('clubs/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.clubs.findOne(id, user);
  }

  @Get('clubs/:id/history')
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.clubs.history(id);
  }

  @Patch('clubs/:id')
  @Authenticated()
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClubNameDto,
  ) {
    return this.clubs.rename(user, id, dto.name);
  }

  @Put('clubs/:id/crest')
  @Authenticated()
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  setCrest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.clubs.setCrest(user, id, file);
  }

  @Delete('clubs/:id')
  @Authenticated()
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clubs.remove(user, id);
  }

  @Post('clubs/:id/members')
  @Authenticated()
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddClubMemberDto,
  ) {
    return this.clubs.addMember(user, id, dto);
  }

  @Delete('club-members/:id')
  @Authenticated()
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clubs.removeMember(user, id);
  }

  @Post('clubs/:id/players')
  @Authenticated()
  addPlayer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePlayerDto,
  ) {
    return this.clubs.addPlayer(user, id, dto);
  }

  @Delete('club-players/:id')
  @Authenticated()
  removePlayer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clubs.removePlayer(user, id);
  }
}
