import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  StreamableFile,
} from '@nestjs/common';
import { ConvertionInfoDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as xmljs from 'xml-js';

@Injectable()
export class FileParserService {
  constructor(private jwt: JwtService) {}

  async convertTxtToJson(
    dto: ConvertionInfoDto,
    multerFile: Express.Multer.File,
  ) {
    try {
      const jsonContent = await this.getJsonFromTxt(dto, multerFile);
      fs.writeFileSync('./outputs/uploaded-txt.json', jsonContent, 'utf8');

      const file = fs.createReadStream('./outputs/uploaded-txt.json');

      return new StreamableFile(file);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  async convertTxtToXml(
    dto: ConvertionInfoDto,
    multerFile: Express.Multer.File,
  ) {
    try {
      const jsonContent = await this.getJsonFromTxt(dto, multerFile);
      const finalJsonContent = JSON.stringify({
        clients: [
          {
            client: JSON.parse(jsonContent),
          },
        ],
      });

      var options = { compact: true, ignoreComment: true, spaces: 4 };
      var result = xmljs.json2xml(finalJsonContent, options);

      fs.writeFileSync('./outputs/uploaded-txt.xml', result, 'utf8');

      const file = fs.createReadStream('./outputs/uploaded-txt.xml');

      return new StreamableFile(file);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  async getJsonFromTxt(dto: ConvertionInfoDto, file: Express.Multer.File) {
    try {
      const data = fs.readFileSync('./uploads/uploaded-txt.txt', 'utf8');
      const subStrings = data.split(dto.separator);

      if (subStrings.length < 7) {
        throw new BadRequestException('Incorrect input parameters');
      }

      const encryptedPayload = await this.encryptCardNumber(
        subStrings[3] ?? '',
        dto.secret,
      );

      const tokenifiedCardNumber = await this.tokenifyEncryptedCardNumber(
        encryptedPayload.encryptedText,
        encryptedPayload.iv,
        dto.secret,
      );

      const json = [
        {
          documento: subStrings[0] ?? '',
          nombres: subStrings[1] ?? '',
          apellidos: subStrings[2] ?? '',
          tarjeta: tokenifiedCardNumber,
          tipo: subStrings[4] ?? '',
          telefono: subStrings[5] ?? '',
          poligono: subStrings[6] ?? '',
        },
      ];

      // Generate json object
      return JSON.stringify(json);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  async encryptCardNumber(cardNumber: string, secret: string) {
    const iv = randomBytes(16);

    // The key length is dependent on the algorithm.
    // In this case for aes256, it is 32 bytes.
    const key = (await promisify(scrypt)(
      secret,
      'secret-salt123',
      32,
    )) as Buffer;

    const cipher = createCipheriv('aes-256-ctr', key, iv);

    const encryptedText = Buffer.concat([
      cipher.update(cardNumber),
      cipher.final(),
    ]);

    return {
      iv: iv.toString('hex'),
      encryptedText: encryptedText.toString('hex'),
    };
  }

  async decryptCardNumber(
    encryptedCardNumber: string,
    iv: string,
    secret: string,
  ) {
    // The key length is dependent on the algorithm.
    // In this case for aes256, it is 32 bytes.
    const key = (await promisify(scrypt)(
      secret,
      'secret-salt123',
      32,
    )) as Buffer;

    const decipher = createDecipheriv(
      'aes-256-ctr',
      key,
      Buffer.from(iv, 'hex'),
    );

    const decryptedText = Buffer.concat([
      decipher.update(Buffer.from(encryptedCardNumber, 'hex')),
      decipher.final(),
    ]);

    return decryptedText.toString();
  }

  async tokenifyEncryptedCardNumber(
    encryptedCardNumber: string,
    iv: string,
    secret: string,
  ) {
    const payLoad = {
      encryptedCardNumber: encryptedCardNumber,
      iv: iv,
    };

    const token = await this.jwt.signAsync(payLoad, {
      secret: secret,
    });

    console.log(token);

    return token;
  }
}
