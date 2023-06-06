import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileParserService } from './file_parser.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { TxtToJsonDto } from './dto';

@Controller('file-parser')
export class FileParserController {
  constructor(private fileParserService: FileParserService) {}

  @Post('txt-to-json')
  @UseInterceptors(FileInterceptor('file'))
  txtToJson(
    @Body() dto: TxtToJsonDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.fileParserService.convertTxtToJson(dto, file);
  }

  @Post('txt-to-xml')
  txtToXml(@Body() dto: {}) {
    return {
      message: 'TODO',
    };
  }
}
