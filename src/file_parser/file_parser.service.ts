import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  StreamableFile,
} from '@nestjs/common';
import { TxtToJsonDto } from './dto';
import * as fs from 'fs';

@Injectable()
export class FileParserService {
  async convertTxtToJson(dto: TxtToJsonDto, file: Express.Multer.File) {
    try {
      const data = fs.readFileSync('./uploads/uploaded-txt.txt', 'utf8');
      const subStrings = data.split(dto.separator);

      if (subStrings.length < 7) {
        throw new BadRequestException('Incorrect input parameters');
      }

      const json = [
        {
          documento: subStrings[0] ?? '',
          nombres: subStrings[1] ?? '',
          apellidos: subStrings[2] ?? '',
          tarjeta: subStrings[3] ?? '',
          tipo: subStrings[4] ?? '',
          telefono: subStrings[5] ?? '',
          poligono: subStrings[6] ?? '',
        },
      ];

      // Generate json object
      var jsonContent = JSON.stringify(json);
      fs.writeFileSync('./outputs/uploaded-txt.json', jsonContent, 'utf8');

      const file = fs.createReadStream('./outputs/uploaded-txt.json');

      return new StreamableFile(file);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('Error reading file');
    }
  }
}
