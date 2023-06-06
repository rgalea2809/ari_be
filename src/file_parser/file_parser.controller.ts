import { Body, Controller, Post } from '@nestjs/common';
import { FileParserService } from './file_parser.service';

@Controller('file-parser')
export class FileParserController {
  constructor(private fileParserService: FileParserService) {}

  @Post('txt-to-json')
  txtToJson(@Body() dto: {}) {
    return this.fileParserService.convertTxtToJson(dto);
  }

  @Post('txt-to-xml')
  txtToXml(@Body() dto: {}) {
    return {
      message: 'TODO',
    };
  }
}
