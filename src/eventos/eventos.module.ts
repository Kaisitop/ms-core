import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { ConfirmacionAlertasService } from './confirmacion-alertas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertasModule } from '../alertas/alertas.module';

@Module({
  imports: [PrismaModule, AlertasModule],
  controllers: [EventosController],
  providers: [EventosService, ConfirmacionAlertasService],
  exports: [EventosService],
})
export class EventosModule {}
