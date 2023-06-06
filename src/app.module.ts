import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileParserModule } from './file_parser/file_parser.module';
import { FileParseService } from './file_parse/file_parse.service';

@Module({
  imports: [FileParserModule],
  controllers: [AppController],
  providers: [AppService, FileParseService],
})
export class AppModule {}
