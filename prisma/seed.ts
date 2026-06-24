import { PrismaClient } from '../generated/prisma';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

/**
 * Seed: Zonas oficiales del cantón Milagro.
 * Lee las geometrías completas desde zonas_milagro.json en la raíz del repositorio.
 */
async function main() {
  console.log('🌱 Iniciando seed de zonas de Milagro...\n');

  // Leer el JSON desde la raíz del monorepo
  const jsonPath = path.resolve(__dirname, '../../../zonas_milagro.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No se encontró el archivo zonas_milagro.json en: ${jsonPath}`);
  }

  const zonas: Array<{
    nombre: string;
    descripcion: string;
    riesgoNivel: number;
    geomWkt: string;
  }> = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`📋 Se encontraron ${zonas.length} zonas para procesar.\n`);

  for (const zona of zonas) {
    // Verificar si la zona ya existe por nombre para evitar duplicados al correr el seed más de una vez
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM app.zonas WHERE nombre = ${zona.nombre} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`⚠️  Zona "${zona.nombre}" ya existe. Saltando...`);
      continue;
    }

    // ST_GeomFromText con SRID 4326 (WGS84) porque las coordenadas son lat/long decimales
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

    console.log(`✅ Zona "${zona.nombre}" insertada (nivel de riesgo: ${zona.riesgoNivel}/5)`);
  }

  console.log('\n🎉 Seed completado. Las zonas de Milagro están listas en la base de datos.');
}

main()
  .catch((e) => {
    console.error('\n❌ Error durante el seed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
