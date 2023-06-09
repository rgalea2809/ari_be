import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { ConvertionInfoDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as xmljs from 'xml-js';
import * as readline from 'readline';
import * as events from 'events';

@Injectable()
export class FileParserService {
  constructor(private jwt: JwtService) {}

  async convertTxtToJson(
    dto: ConvertionInfoDto,
    multerFile: Express.Multer.File,
  ) {
    try {
      const jsonContent = await this.getJsonFromTxt(dto, multerFile);
      fs.writeFileSync(
        './outputs/output-of-uploaded-txt.json',
        jsonContent,
        'utf8',
      );

      const file = fs.createReadStream('./outputs/output-of-uploaded-txt.json');

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
      const parsedJsonContent = JSON.parse(jsonContent);

      const finalJsonContent = JSON.stringify({
        clients: [
          {
            client: parsedJsonContent,
          },
        ],
      });

      var options = { compact: true, ignoreComment: true, spaces: 4 };
      var result = xmljs.json2xml(finalJsonContent, options);

      fs.writeFileSync('./outputs/output-of-uploaded-txt.xml', result, 'utf8');

      const file = fs.createReadStream('./outputs/output-of-uploaded-txt.xml');

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
      var informationLines: [string?] = [];

      const rl = readline.createInterface({
        input: fs.createReadStream('./uploads/uploaded-txt.txt', 'utf8'),
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        informationLines.push(line);
      });

      await events.once(rl, 'close');

      var json: [object?] = [];
      console.log(informationLines);
      for (var line in informationLines) {
        const subStrings = informationLines[line].split(dto.separator);

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

        json.push({
          documento: subStrings[0] ?? '',
          nombres: subStrings[1] ?? '',
          apellidos: subStrings[2] ?? '',
          tarjeta: tokenifiedCardNumber,
          tipo: subStrings[4] ?? '',
          telefono: subStrings[5] ?? '',
          poligono: subStrings[6] ?? '',
        });
      }

      // Generate json object
      return JSON.stringify(json);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  async convertJsonToTxt(
    dto: ConvertionInfoDto,
    multerFile: Express.Multer.File,
  ) {
    try {
      const rawdata = fs.readFileSync('./uploads/uploaded-json.json', 'utf8');
      const clients = JSON.parse(rawdata);

      if (!clients || clients.length < 1) {
        throw new BadRequestException('Incorrect input parameters');
      }

      var txtContent = '';

      for (var client in clients) {
        const cardPayload = await this.extractPayloadFromToken(
          clients[client].tarjeta,
          dto.secret,
        );

        const originalCardNumber = await this.decryptCardNumber(
          cardPayload.encryptedCardNumber,
          cardPayload.iv,
          dto.secret,
        );

        console.log(cardPayload);

        txtContent = txtContent.concat(
          `${clients[client].documento}${dto.separator}` +
            `${clients[client].nombres}${dto.separator}$` +
            `${clients[client].apellidos}${dto.separator}` +
            `${originalCardNumber}${dto.separator}` +
            `${clients[client].tipo}${dto.separator}` +
            `${clients[client].telefono}${dto.separator}` +
            `${clients[client].poligono}${dto.separator}\n`,
        );
      }

      fs.writeFileSync(
        './outputs/output-of-uploaded-json.txt',
        txtContent,
        'utf8',
      );

      const file = fs.createReadStream('./outputs/output-of-uploaded-json.txt');

      return new StreamableFile(file);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  /// Utils
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

  async extractPayloadFromToken(token: string, secret: string) {
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: secret,
      });

      return payload;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
