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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

const MAX_RULES_PDF_BYTES = 10 * 1024 * 1024;

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournaments.create(dto);
  }

  @Get()
  findAll() {
    return this.tournaments.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournaments.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tournaments.remove(id);
  }

  @Post(':id/rules')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) =>
          cb(null, `${req.params.id}-rules${extname(file.originalname) || '.pdf'}`),
      }),
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
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Missing "file" field with a PDF');
    return this.tournaments.setRulesPdf(id, file.filename);
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
