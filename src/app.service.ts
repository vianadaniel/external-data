import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  test(): string {
    return 'Report is working!';
  }
}
