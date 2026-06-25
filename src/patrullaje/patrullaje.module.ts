import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from '../config/envs';
import { PrismaModule } from '../prisma/prisma.module';
import { PatrullajeController } from './patrullaje.controller';
import { PatrullajeService } from './patrullaje.service';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: envs.natsServers,
        },
      },
    ]),
  ],
  controllers: [PatrullajeController],
  providers: [PatrullajeService],
  exports: [PatrullajeService],
})
export class PatrullajeModule {}
