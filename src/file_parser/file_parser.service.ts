import { Injectable } from '@nestjs/common';

@Injectable()
export class FileParserService {
  async convertTxtToJson(dto: {}) {
    return {
      message: 'TODO',
    };
  }
}
