import { Module } from '@nestjs/common';
import { FileParserService } from './file_parser.service';
import { FileParserController } from './file_parser.controller';

@Module({
  providers: [FileParserService],
  controllers: [FileParserController],
})
export class FileParserModule {}
