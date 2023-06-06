import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileParserModule } from './file_parser/file_parser.module';

@Module({
  imports: [FileParserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
