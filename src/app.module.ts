import { Module } from '@nestjs/common';
import { FileParserModule } from './file_parser/file_parser.module';

@Module({
  imports: [FileParserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
