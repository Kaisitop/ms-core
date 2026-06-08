import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertasModule } from '../alertas/alertas.module';

@Module({
  imports: [PrismaModule, AlertasModule],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService]
})
export class ReportesModule {}
