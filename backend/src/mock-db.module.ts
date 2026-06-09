import { Module, Global } from '@nestjs/common';
import { MockDatabase } from './mock-db';

@Global()
@Module({
  providers: [MockDatabase],
  exports: [MockDatabase],
})
export class MockDbModule {}
