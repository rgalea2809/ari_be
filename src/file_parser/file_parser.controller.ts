import {
  Body,
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileParserService } from './file_parser.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { TxtToJsonDto } from './dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';

@Controller('file-parser')
export class FileParserController {
  constructor(private fileParserService: FileParserService) {}

  @Post('txt-to-json')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uploadedTxtName = 'uploaded-txt';
          cb(null, `${uploadedTxtName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  txtToJson(
    @Body() dto: TxtToJsonDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'text/plain', // || 'application/xml' || 'application/json'
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment;',
    });

    return this.fileParserService.convertTxtToJson(dto, file);
  }

  @Post('txt-to-xml')
  txtToXml(@Body() dto: {}) {
    return {
      message: 'TODO',
    };
  }
}
