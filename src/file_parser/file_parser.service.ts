import { Injectable } from '@nestjs/common';
import { TxtToJsonDto } from './dto';

@Injectable()
export class FileParserService {
  async convertTxtToJson(dto: TxtToJsonDto, file: Express.Multer.File) {
    console.log(file);
    console.log(dto);

    return {
      message: 'TODO',
    };
  }
}
