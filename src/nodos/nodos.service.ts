import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNodoDto, UpdateNodoDto } from './dto';

@Injectable()
export class NodosService {
  private readonly logger = new Logger(NodosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createNodoDto: CreateNodoDto) {
    const {
      codigo,
      descripcion = null,
      zonaId,
      latitud,
      longitud,
      versionFw = null,
    } = createNodoDto;
    const latitudNodo = latitud ?? null;
    const longitudNodo = longitud ?? null;

    // Verificar que la zona existe
    const zona = await this.prisma.zona.findUnique({
      where: { id: zonaId },
    });
    if (!zona) {
      throw new RpcException({ statusCode: 404, message: `Zona con id ${zonaId} no encontrada` });
    }

    // Verificar que el código de nodo sea único
    const existing = await this.prisma.nodo.findUnique({
      where: { codigo },
    });
    if (existing) {
      throw new RpcException({ statusCode: 409, message: `Ya existe un nodo con el código ${codigo}` });
    }

    try {
      const result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO app.nodos (
          id, codigo, descripcion, ubicacion, zona_id, version_fw, estado, activo, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${codigo},
          ${descripcion},
          CASE
            WHEN ${latitudNodo}::double precision IS NOT NULL AND ${longitudNodo}::double precision IS NOT NULL
              THEN ST_SetSRID(ST_MakePoint(${longitudNodo}, ${latitudNodo}), 4326)
            WHEN EXISTS (
              SELECT 1 FROM app.zonas z WHERE z.id = CAST(${zonaId} AS uuid) AND NOT ST_IsEmpty(z.geom)
            )
              THEN (
                SELECT ST_Centroid(z.geom) FROM app.zonas z WHERE z.id = CAST(${zonaId} AS uuid)
              )
            ELSE ST_SetSRID(ST_MakePoint(0, 0), 4326)
          END,
          CAST(${zonaId} AS uuid),
          ${versionFw},
          'activo',
          true,
          NOW(),
          NOW()
        )
        RETURNING id, codigo, descripcion, zona_id as "zonaId", version_fw as "versionFw", estado, activo, created_at as "createdAt", updated_at as "updatedAt"
      `;

      return result[0];
    } catch (error) {
      this.logger.error(`Error al crear nodo: ${error.message}`, error.stack);
      if (error.code === '23505') {
        throw new RpcException({ statusCode: 409, message: `Ya existe un nodo con el código ${codigo}` });
      }

      throw new RpcException({ statusCode: 500, message: 'Error interno al crear el nodo IoT' });
    }
  }

  async findAll(zonaId?: string) {
    return this.prisma.nodo.findMany({
      where: {
        activo: true,
        ...(zonaId ? { zonaId } : {}),
      },
      include: {
        zona: { select: { id: true, nombre: true } },
      },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const nodo = await this.prisma.nodo.findUnique({
      where: { id },
      include: {
        zona: { select: { id: true, nombre: true } },
        _count: { select: { eventos: true } },
      },
    });

    if (!nodo) {
      throw new RpcException({ statusCode: 404, message: `Nodo con id ${id} no encontrado` });
    }

    return nodo;
  }

  async update(id: string, updateNodoDto: UpdateNodoDto) {
    await this.findOne(id); // Verifica existencia

    return this.prisma.nodo.update({
      where: { id },
      data: updateNodoDto,
    });
  }

  async heartbeat(id: string) {
    // Actualiza la última señal de vida del nodo IoT
    const nodo = await this.prisma.nodo.findUnique({ where: { id } });
    if (!nodo) {
      throw new RpcException({ statusCode: 404, message: `Nodo con id ${id} no encontrado` });
    }

    return this.prisma.nodo.update({
      where: { id },
      data: {
        ultimoHeartbeat: new Date(),
        estado: 'activo',
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.nodo.update({
      where: { id },
      data: { activo: false, estado: 'inactivo' },
    });
  }
}
