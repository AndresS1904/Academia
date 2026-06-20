import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { UploadsServeController } from './uploads-serve.controller';

@Module({
  imports: [MulterModule.register()],
  providers: [UploadsService],
  controllers: [UploadsController, UploadsServeController],
})
export class UploadsModule {}
