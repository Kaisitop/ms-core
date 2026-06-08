import { Module } from '@nestjs/common';
import { NodosService } from './nodos.service';
import { NodosController } from './nodos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NodosController],
  providers: [NodosService],
  exports: [NodosService],
})
export class NodosModule {}
