import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZonasModule } from './zonas/zonas.module';
import { NodosModule } from './nodos/nodos.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventosModule } from './eventos/eventos.module';
import { ReportesModule } from './reportes/reportes.module';
import { AlertasModule } from './alertas/alertas.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    ZonasModule,
    NodosModule,
    EventosModule,
    ReportesModule,
    AlertasModule,
    NotificacionesModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
