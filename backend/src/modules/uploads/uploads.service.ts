import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  getFileUrl(folder: string, filename: string): string {
    const base = process.env.APP_URL || 'http://localhost:3001';
    return `${base}/uploads/${folder}/${filename}`;
  }
}
