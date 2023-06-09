import { Module } from '@nestjs/common';
import { FileParserService } from './file_parser.service';
import { FileParserController } from './file_parser.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})],
  providers: [FileParserService],
  controllers: [FileParserController],
})
export class FileParserModule {}
