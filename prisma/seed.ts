import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as path from 'path';
import * as fs from 'fs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const nodeCodesByZoneName: Record<string, string> = {
  'Roberto Astudillo': 'NODO-ROBERTO-ASTUDILLO',
  Milagro: 'NODO-MILAGRO',
  Chobo: 'NODO-CHOBO',
  'Mariscal Sucre (Huaques)': 'NODO-MARISCAL-SUCRE',
};

async function main() {
  console.log('Iniciando seed de zonas de Milagro...\n');

  const jsonPath = path.resolve(__dirname, 'zonas_milagro.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No se encontro el archivo zonas_milagro.json en: ${jsonPath}`);
  }

  const zonas: Array<{
    nombre: string;
    descripcion: string;
    riesgoNivel: number;
    geomWkt: string;
  }> = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Se encontraron ${zonas.length} zonas para procesar.\n`);

  for (const zona of zonas) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM app.zonas WHERE nombre = ${zona.nombre} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`Zona "${zona.nombre}" ya existe. Saltando...`);
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO app.zonas (id, nombre, descripcion, geom, riesgo_nivel, activa, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${zona.nombre},
        ${zona.descripcion},
        ST_GeomFromText(${zona.geomWkt}, 4326),
        ${zona.riesgoNivel},
        true,
        NOW(),
        NOW()
      )
    `;

    console.log(`Zona "${zona.nombre}" insertada (nivel de riesgo: ${zona.riesgoNivel}/5)`);
  }

  console.log('\nCreando/verificando nodos moviles por zona...\n');

  for (const zona of zonas) {
    const codigo = nodeCodesByZoneName[zona.nombre];
    if (!codigo) {
      console.log(`Zona "${zona.nombre}" sin codigo de nodo configurado. Saltando...`);
      continue;
    }

    const descripcion = `Nodo movil Flutter asignado a la zona ${zona.nombre}`;

    await prisma.$executeRaw`
      INSERT INTO app.nodos (
        id,
        codigo,
        descripcion,
        ubicacion,
        zona_id,
        version_fw,
        estado,
        activo,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        ${codigo},
        ${descripcion},
        CASE
          WHEN z.geom IS NOT NULL AND NOT ST_IsEmpty(z.geom)
            THEN ST_PointOnSurface(z.geom)
          ELSE ST_SetSRID(ST_MakePoint(0, 0), 4326)
        END,
        z.id,
        'Flutter',
        'activo',
        true,
        NOW(),
        NOW()
      FROM app.zonas z
      WHERE z.nombre = ${zona.nombre}
      ON CONFLICT (codigo) DO UPDATE SET
        descripcion = EXCLUDED.descripcion,
        ubicacion = EXCLUDED.ubicacion,
        zona_id = EXCLUDED.zona_id,
        version_fw = EXCLUDED.version_fw,
        estado = 'activo',
        activo = true,
        updated_at = NOW()
    `;

    console.log(`Nodo "${codigo}" listo para zona "${zona.nombre}"`);
  }

  console.log('\nSeed completado. Zonas y nodos moviles de Milagro listos.');
}

main()
  .catch((e) => {
    console.error('\nError durante el seed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
