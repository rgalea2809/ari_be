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
      if (!fs.existsSync('./outputs')) {
        fs.mkdirSync('./outputs');
      }

      fs.writeFileSync(
        './outputs/output-of-uploaded-txt.json',
        jsonContent,
        'utf8',
      );

      const file = fs.createReadStream('./outputs/output-of-uploaded-txt.json');

      return new StreamableFile(file);
    } catch (err) {
      console.log('Error @ convertTxtToJson: ' + err);
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
      const jsonContent = await this.getJsonFromTxt(dto, multerFile, true);
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

      if (!fs.existsSync('./outputs')) {
        fs.mkdirSync('./outputs');
      }

      fs.writeFileSync('./outputs/output-of-uploaded-txt.xml', result, 'utf8');

      const file = fs.createReadStream('./outputs/output-of-uploaded-txt.xml');

      return new StreamableFile(file);
    } catch (err) {
      console.log('Error @ convertTxtToXml: ' + err);
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  async getJsonFromTxt(
    dto: ConvertionInfoDto,
    file: Express.Multer.File,
    isForXml: boolean = false,
  ) {
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
      for (var line in informationLines) {
        const subStrings = informationLines[line].split(dto.separator);

        if (subStrings.length != 7) {
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

        const convertedCoordinates = await this.convertCoordsFromTxtToJson(
          subStrings[6],
          isForXml,
        );

        json.push({
          documento: subStrings[0] ?? '',
          nombres: subStrings[1] ?? '',
          apellidos: subStrings[2] ?? '',
          tarjeta: tokenifiedCardNumber,
          tipo: subStrings[4] ?? '',
          telefono: subStrings[5] ?? '',
          poligono: convertedCoordinates.parsedCoordinates ?? '',
        });
      }

      // Generate json object
      return JSON.stringify(json);
    } catch (err) {
      console.log('Error @ getJsonFromTxt: ' + err);
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

        const poligonString = await this.parseJsonPolygonToStringPolygon(
          clients[client].poligono,
        );

        txtContent = txtContent.concat(
          `${clients[client].documento}${dto.separator}` +
            `${clients[client].nombres}${dto.separator}` +
            `${clients[client].apellidos}${dto.separator}` +
            `${originalCardNumber}${dto.separator}` +
            `${clients[client].tipo}${dto.separator}` +
            `${clients[client].telefono}${dto.separator}` +
            `${poligonString}\n`,
        );
      }

      if (!fs.existsSync('./outputs')) {
        fs.mkdirSync('./outputs');
      }

      fs.writeFileSync(
        './outputs/output-of-uploaded-json.txt',
        txtContent,
        'utf8',
      );

      const file = fs.createReadStream('./outputs/output-of-uploaded-json.txt');

      return new StreamableFile(file);
    } catch (err) {
      console.log('Error @ convertJsonToTxt: ' + err);
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException('Error processing file');
    }
  }

  async convertXmlToTxt(
    dto: ConvertionInfoDto,
    multerFile: Express.Multer.File,
  ) {
    try {
      const rawdata = fs.readFileSync('./uploads/uploaded-xml.xml', 'utf8');
      var options = {
        compact: true,
      };
      var result = xmljs.xml2json(rawdata, options);
      const jsonObject = JSON.parse(result);
      const clients = jsonObject.clients.client;

      if (!clients || clients.length < 1) {
        throw new BadRequestException('Incorrect input parameters');
      }

      var txtContent = '';

      for (var clientIndex in clients) {
        const currentClient = clients[clientIndex];

        const parsedCoordinatesString =
          await this.parseJsonPolygonToStringPolygonFromXml(
            currentClient.poligono.coordenadas,
          );

        const cardPayload = await this.extractPayloadFromToken(
          currentClient.tarjeta._text,
          dto.secret,
        );

        const originalCardNumber = await this.decryptCardNumber(
          cardPayload.encryptedCardNumber,
          cardPayload.iv,
          dto.secret,
        );

        txtContent = txtContent.concat(
          `${currentClient.documento._text}${dto.separator}` +
            `${currentClient.nombres._text}${dto.separator}$` +
            `${currentClient.apellidos._text}${dto.separator}` +
            `${originalCardNumber}${dto.separator}` +
            `${currentClient.tipo._text}${dto.separator}` +
            `${currentClient.telefono._text}${dto.separator}` +
            `${parsedCoordinatesString}\n`,
        );
      }

      if (!fs.existsSync('./outputs')) {
        fs.mkdirSync('./outputs');
      }

      fs.writeFileSync(
        './outputs/output-of-uploaded-xml.txt',
        txtContent,
        'utf8',
      );

      const file = fs.createReadStream('./outputs/output-of-uploaded-xml.txt');

      return new StreamableFile(file);
    } catch (err) {
      console.log('Error @ convertXmlToTxt: ' + err);
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

    return token;
  }

  async extractPayloadFromToken(token: string, secret: string) {
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: secret,
      });

      return payload;
    } catch (err) {
      console.log('Error @ extractPayloadFromToken: ' + err);
      throw new UnauthorizedException();
    }
  }

  async convertCoordsFromTxtToJson(
    coordsArray: string,
    isForXml: boolean = false,
  ) {
    try {
      const subStrings = coordsArray.split(']').filter((str) => str !== '');
      let parsedCoordinates: [number[]?] = [];

      for (var subStringIndex in subStrings) {
        const currentCoordinatesSubString = subStrings[subStringIndex];
        const coordinates = currentCoordinatesSubString.replace('[', '');
        const separatedCoordinates = coordinates.split(',');

        const finalCoordinates = separatedCoordinates.map(function (str) {
          return parseFloat(str) || 0;
        });

        parsedCoordinates.push(finalCoordinates);
      }

      if (isForXml) {
        let xmlTags: [object?] = [];

        for (var coordinatesIndex in parsedCoordinates) {
          const currentCoordinatesPair = parsedCoordinates[coordinatesIndex];

          xmlTags.push({
            x: currentCoordinatesPair[0],
            y: currentCoordinatesPair[1],
          });
        }

        return { parsedCoordinates: { coordenadas: xmlTags } };
      }

      return { parsedCoordinates };
    } catch (err) {
      throw err;
    }
  }

  async parseJsonPolygonToStringPolygon(polygon: [string[]]) {
    var finalPolygonString = '';

    for (var polygonIndex in polygon) {
      const currentCoords = polygon[polygonIndex];

      finalPolygonString = finalPolygonString.concat(
        '[' + currentCoords[0] + ',' + currentCoords[1] + ']',
      );
    }

    return finalPolygonString;
  }

  async parseJsonPolygonToStringPolygonFromXml(polygon: [any]) {
    var finalPolygonString = '';

    for (var polygonIndex in polygon) {
      const currentCoordsObject = polygon[polygonIndex];

      finalPolygonString = finalPolygonString.concat(
        '[' +
          currentCoordsObject.x._text +
          ',' +
          currentCoordsObject.y._text +
          ']',
      );
    }

    return finalPolygonString;
  }
}
