import { Module } from '@nestjs/common';
import { TokenStoreService } from './token-store.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [TokenStoreService, PrismaService],
  exports: [TokenStoreService],
})
export class TokenStoreModule {}
