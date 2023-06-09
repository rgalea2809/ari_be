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
import { ConvertionInfoDto } from './dto';
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
    @Body() dto: ConvertionInfoDto,
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
    return this.fileParserService.convertTxtToJson(dto, file);
  }

  @Post('txt-to-xml')
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
  txtToXml(
    @Body() dto: ConvertionInfoDto,
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
    return this.fileParserService.convertTxtToXml(dto, file);
  }

  @Post('json-to-txt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uploadedTxtName = 'uploaded-json';
          cb(null, `${uploadedTxtName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  jsonToTxt(
    @Body() dto: ConvertionInfoDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'application/json', // || 'application/xml' || 'application/json'
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.fileParserService.convertJsonToTxt(dto, file);
  }
}
