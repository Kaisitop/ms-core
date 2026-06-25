import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { ConfirmacionAlertasService } from './confirmacion-alertas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertasModule } from '../alertas/alertas.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from '../config/envs';

@Module({
  imports: [
    PrismaModule,
    AlertasModule,
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: { servers: envs.natsServers },
      },
    ]),
  ],
  controllers: [EventosController],
  providers: [EventosService, ConfirmacionAlertasService],
  exports: [EventosService],
})
export class EventosModule {}
