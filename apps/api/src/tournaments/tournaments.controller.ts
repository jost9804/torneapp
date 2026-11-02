import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
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
import { Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { AccessService } from '../access/access.service';
import { Authenticated, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

const MAX_RULES_PDF_BYTES = 10 * 1024 * 1024;

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournaments: TournamentsService,
    private readonly access: AccessService,
  ) {}

  @Post()
  @Authenticated()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTournamentDto) {
    return this.tournaments.create(user, dto);
  }

  /** `sort=popular` orders by likes; `following=true` keeps the ones the user follows */
  @Get()
  findAll(
    @CurrentUser() user: AuthUser | undefined,
    @Query('sort') sort?: string,
    @Query('following') following?: string,
  ) {
    return this.tournaments.findAll(user, {
      popular: sort === 'popular',
      following: following === 'true',
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.tournaments.findOne(id, user);
  }

  @Patch(':id')
  @Authenticated()
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournaments.update(user, id, dto);
  }

  @Delete(':id')
  @Authenticated()
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tournaments.remove(user, id);
  }

  @Put(':id/like')
  @Authenticated()
  like(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.setLike(user, id, true);
  }

  @Delete(':id/like')
  @Authenticated()
  unlike(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.setLike(user, id, false);
  }

  @Put(':id/follow')
  @Authenticated()
  follow(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.setFollow(user, id, true);
  }

  @Delete(':id/follow')
  @Authenticated()
  unfollow(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.setFollow(user, id, false);
  }

  // Kept in memory until the admin check passes, so nobody else can overwrite the PDF
  @Post(':id/rules')
  @Authenticated()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RULES_PDF_BYTES },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadRules(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.tournaments.findOne(id);
    await this.access.requireAdmin(user, id);
    if (!file) throw new BadRequestException('Missing "file" field with a PDF');
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `${id}-rules.pdf`;
    await writeFile(join(UPLOADS_DIR, filename), file.buffer);
    return this.tournaments.setRulesPdf(id, filename);
  }

  @Get(':id/rules')
  async downloadRules(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const tournament = await this.tournaments.findOne(id);
    if (!tournament.rulesPdfPath) {
      throw new NotFoundException('This tournament has no rules PDF');
    }
    res.sendFile(tournament.rulesPdfPath, {
      root: UPLOADS_DIR,
      headers: { 'Content-Type': 'application/pdf' },
    });
  }
}
