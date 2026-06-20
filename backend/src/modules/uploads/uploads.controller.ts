import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

function storageFor(folder: string) {
  return diskStorage({
    destination: join(process.cwd(), 'uploads', folder),
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}${extname(file.originalname)}`);
    },
  });
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('logo')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageFor('images/logos'),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: this.uploadsService.getFileUrl('images/logos', file.filename) };
  }

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageFor('images/site'),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: this.uploadsService.getFileUrl('images/site', file.filename) };
  }

  @Post('course-thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageFor('courses/thumbnails'),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: this.uploadsService.getFileUrl('courses/thumbnails', file.filename) };
  }

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageFor('resources/files'),
      fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'application/zip', 'application/octet-stream'];
        if (!allowed.includes(file.mimetype) && !file.originalname.match(/\.(pdf|zip|docx|xlsx)$/)) {
          return cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: this.uploadsService.getFileUrl('resources/files', file.filename) };
  }

  @Post('question-image')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageFor('images/questions'),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadQuestionImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: this.uploadsService.getFileUrl('images/questions', file.filename) };
  }

  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storageFor('resources/videos'),
      fileFilter: (_req, file, cb) => {
        const videoMimes = [
          'video/mp4', 'video/x-matroska', 'video/avi', 'video/quicktime',
          'video/x-msvideo', 'video/webm', 'video/x-ms-wmv', 'video/mpeg',
          'video/3gpp', 'video/ogg',
        ];
        const videoExts = /\.(mp4|mkv|avi|mov|wmv|webm|mpeg|mpg|3gp|ogv|flv|ts|m4v)$/i;
        if (!videoMimes.includes(file.mimetype) && !file.originalname.match(videoExts)) {
          return cb(new BadRequestException('Solo se permiten archivos de video'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: this.uploadsService.getFileUrl('resources/videos', file.filename) };
  }
}
