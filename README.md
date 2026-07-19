# ms-core - Guia tecnica y patrones NATS

> **Monorepo:** [README.md](../README.md) · [docs/contexto.md](../docs/contexto.md)

`ms-core` contiene la logica operativa de CENTINELA: zonas, nodos moviles, eventos de audio, reportes ciudadanos, alertas y patrullaje GPS.

**Capacidades recientes:** estado alerta `en_proceso`, patrullero más cercano (`patrullaje.findNearest`), posiciones GPS, purge operativo (`maintenance.purgeAppData`), sincronización alerta ↔ reporte.

## Prototipo de titulacion

En la arquitectura original se hablaba de Raspberry Pi + microfonos INMP441. Para el prototipo academico, ese nodo fisico se reemplaza por una app movil:

```text
App movil con microfono y GPS
  -> publica deteccion por MQTT
  -> bridge MQTT o gateway
  -> ms-core crea evento
  -> PostGIS calcula zona o usa zona del nodo
  -> ms-core genera alerta
```

Por eso, en este proyecto:

```text
Nodo = dispositivo de captura registrado
```

Puede ser un telefono de patrullero, operador o prototipo de app movil. La ubicacion importante del audio se envia en cada evento con `latitud` y `longitud`.

## Configuracion

```env
PORT=3001
NATS_SERVICE="nats://localhost:4222"
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/coreDB?schema=public"
```

La base requiere PostgreSQL + PostGIS.

```bash
npx.cmd prisma migrate deploy
npm run start:dev
```

## Reglas geoespaciales

PostGIS usa puntos en orden `X, Y`:

```text
ST_MakePoint(longitud, latitud)
```

Esto es correcto:

```text
longitud = X
latitud = Y
SRID = 4326
```

Regla para eventos:

```text
1. El evento recibe latitud y longitud.
2. Se guarda en eventos.ubicacion.
3. Se busca zona con ST_Contains(zonas.geom, punto).
4. Si no hay zona y existe nodoId, se usa nodo.zonaId como fallback.
5. Si severidad >= 2 o subtipo es disparo/grito, se crea alerta.
```

Escala de severidad (1–5): reportes ciudadanos usan el catálogo de `src/reportes/constants/reporte-tipos.ts` (pánico/homicidio/secuestro = 4, robo/extorsión = 3, sospechosos = 2); los eventos de audio usan la sugerida por ms-ia (disparo = 3, grito = 2, normal = 1). Justificación en `docs/contexto.md` del monorepo.

## Patrones NATS

### Zonas

| Pattern | Payload | Descripcion |
|---|---|---|
| `zonas.create` | `CreateZonaDto` | Crea una zona |
| `zonas.findAll` | `{}` | Lista zonas activas |
| `zonas.findOne` | `string` | Busca por id |
| `zonas.update` | `{ id, data }` | Actualiza una zona |
| `zonas.remove` | `string` | Desactiva una zona |

Crear zona:

```json
{
  "nombre": "Zona Centro Milagro",
  "descripcion": "Area comercial principal",
  "riesgoNivel": 3,
  "geomWkt": "POLYGON((-79.6000 -2.1600, -79.5800 -2.1600, -79.5800 -2.1800, -79.6000 -2.1800, -79.6000 -2.1600))"
}
```

Campos:

```text
nombre: string, obligatorio
descripcion: string, opcional
riesgoNivel: number 1..5, opcional
geomWkt: string WKT, opcional
```

Si `geomWkt` no se envia, se guarda `POLYGON EMPTY`. En ese caso, los eventos pueden tomar la zona desde el nodo como fallback.

### Usuario Zonas

| Pattern | Payload | Descripcion |
|---|---|---|
| `usuario_zonas.set_principal` | `ManageUsuarioZonaDto` | Establece la zona principal (única) del usuario |
| `usuario_zonas.subscribe` | `ManageUsuarioZonaDto` | Suscribe a una zona adicional (máximo 3) |
| `usuario_zonas.unsubscribe` | `ManageUsuarioZonaDto` | Elimina la asociación de una zona |
| `usuario_zonas.get_by_user` | `string` (usuarioId) | Devuelve las zonas asignadas al usuario |

Payload para `set_principal`, `subscribe` o `unsubscribe`:

```json
{
  "usuarioId": "{{usuarioId}}",
  "zonaId": "{{zonaId}}"
}
```

Reglas:
- Solo puede existir 1 zona `principal` por usuario. Si se establece otra, se reemplaza la anterior automáticamente.
- Se permiten máximo 3 zonas `suscrita` por usuario.
- `get_by_user` devuelve un arreglo con la relación de zonas y sus campos básicos.

### Nodos

| Pattern | Payload | Descripcion |
|---|---|---|
| `nodos.create` | `CreateNodoDto` | Registra dispositivo de captura |
| `nodos.findAll` | `{ zonaId?: string }` | Lista nodos |
| `nodos.findOne` | `string` | Busca por id |
| `nodos.update` | `{ id, data }` | Actualiza nodo |
| `nodos.heartbeat` | `string` | Marca nodo activo |
| `nodos.remove` | `string` | Desactiva nodo |

Crear nodo movil:

```json
{
  "codigo": "MOVIL-OP-02",
  "descripcion": "iPhone - Patrullero zona sur",
  "zonaId": "{{zonaId}}",
  "versionFw": "iOS-17.0"
}
```

Con ubicacion inicial:

```json
{
  "codigo": "MOVIL-OP-03",
  "descripcion": "Android - Patrullero zona centro",
  "zonaId": "{{zonaId}}",
  "latitud": -2.1709,
  "longitud": -79.5871,
  "versionFw": "Android-14"
}
```

Campos:

```text
codigo: string, obligatorio, unico
descripcion: string, opcional
zonaId: uuid, obligatorio
latitud: number, opcional
longitud: number, opcional
versionFw: string, opcional
```

Si no se envia ubicacion inicial, el servicio usa el centroide de la zona. Si la zona no tiene poligono real, usa `(0,0)` como ubicacion tecnica provisional.

### Eventos

| Pattern | Payload | Descripcion |
|---|---|---|
| `eventos.create` | `CreateEventoDto` | Crea evento de audio/manual/ciudadano |
| `eventos.findAll` | `{}` | Lista ultimos 100 eventos |

Evento enviado por app movil:

```json
{
  "tipo": "audio",
  "subtipo": "disparo",
  "nodoId": "{{nodoId}}",
  "latitud": -2.1709,
  "longitud": -79.5871,
  "confianza": 0.95,
  "severidad": 4,
  "fuente": "app_movil",
  "audioUrl": "https://storage.centinela.com/audio/clip-001.wav",
  "metadatos": {
    "modelo": "yamnet-mobile",
    "disparo": 0.95,
    "grito": 0.02
  }
}
```

Campos:

```text
tipo: audio | manual | ciudadano
subtipo: disparo | grito | fuego_artificial | petardo | moto_sin_silenciador | otro
nodoId: uuid, opcional pero recomendado para fallback de zona
latitud: number, obligatorio
longitud: number, obligatorio
confianza: number 0..1, opcional
severidad: number 1..4, opcional
fuente: string, obligatorio. Ej: app_movil, yamnet, operador
audioUrl: string, opcional
metadatos: object, opcional
```

### Reportes

| Pattern | Payload | Descripcion |
|---|---|---|
| `reportes.create` | `CreateReporteDto` | Crea reporte ciudadano |
| `reportes.findAll` | `{}` o `{ usuarioId }` | Lista reportes (incluye `fotosUrls`, `eventoId`) |
| `reportes.findOne` | `{ id, usuarioId? }` | Detalle con fotos, operador y cierre |
| `reportes.updateStatus` | `UpdateReporteStatusDto` | Cambia estado |

**Campo `fotosUrls`:** se persiste en `app.reportes.fotos_urls` como texto JSON (`["https://...", ...]`). Las URLs provienen de Cloudinary vía `c-gateway` (`POST /api/media/upload?tipo=reporte`). Admin y operador las consultan en `findOne` / listado enriquecido.

Crear reporte:

```json
{
  "usuarioId": "{{usuarioId}}",
  "tipo": "panico",
  "descripcion": "Me estan asaltando frente al mercado",
  "latitud": -2.1709,
  "longitud": -79.5871,
  "fotosUrls": [
    "https://storage.centinela.com/evidencia1.jpg"
  ]
}
```

Actualizar estado:

```json
{
  "id": "{{reporteId}}",
  "estado": "en_proceso",
  "operadorId": "{{operadorId}}",
  "notasOperador": "Patrulla asignada"
}
```

Estados usados:

```text
pendiente | en_proceso | resuelto | falso
```

### Alertas

| Pattern | Payload | Descripcion |
|---|---|---|
| `alertas.create` | `CreateAlertaDto` | Crea alerta operativa |
| `alertas.findAll` | `{}` | Lista alertas (incluye `evidenciaUrls` y `reporte.fotosUrls`) |
| `alertas.findOne` | `{ id }` | Detalle completo con evidencia y fotos del reporte vinculado |
| `alertas.updateStatus` | `UpdateAlertaDto` | Cambia estado (activa, en_proceso, reconocida, cerrada, …) |

Estados de alerta:

```text
activa → en_proceso → reconocida → cerrada | falsa_alarma | completada
```

| Pattern | Payload | Descripcion |
|---|---|---|
| `patrullaje.updatePosicion` | `{ latitud, longitud, … }` | GPS patrullero |
| `patrullaje.findNearest` | `{ latitud, longitud }` | Patrullero más cercano |
| `maintenance.purgeAppData` | `{ requestedBy }` | Limpia datos operativos (admin) |

**Campo `evidenciaUrls`:** se persiste en `app.alertas.evidencia_urls` como JSON array de URLs Cloudinary (evidencia policial al cerrar). En `findOne`, el reporte anidado expone `fotosUrls` del ciudadano cuando `reporte_id` está presente.

Cerrar alerta con evidencia (vía gateway `PATCH /alertas/:id/cerrar`):

```json
{
  "id": "{{alertaId}}",
  "estado": "completada",
  "comentarioCierre": "Caso atendido",
  "evidenciaUrls": "[\"https://res.cloudinary.com/.../foto.jpg\"]"
}
```

Crear alerta manual:

```json
{
  "codigo": "ALT-MANUAL-001",
  "tipo": "manual",
  "descripcion": "Alerta creada por operador",
  "zonaId": "{{zonaId}}",
  "severidad": 2,
  "generadaPor": "operador"
}
```

Reconocer alerta:

```json
{
  "id": "{{alertaId}}",
  "estado": "reconocida",
  "operadorId": "{{operadorId}}"
}
```

Cerrar alerta:

```json
{
  "id": "{{alertaId}}",
  "estado": "cerrada",
  "operadorId": "{{operadorId}}",
  "notas": "Caso atendido por unidad policial"
}
```

Cerrar como falsa alarma:

```json
{
  "id": "{{alertaId}}",
  "estado": "falsa_alarma",
  "operadorId": "{{operadorId}}",
  "notas": "Sonido confirmado como petardo"
}
```

## Payload MQTT recomendado

El bridge MQTT debe recibir algo equivalente a:

```json
{
  "codigoNodo": "MOVIL-OP-02",
  "nodoId": "{{nodoId}}",
  "tipo": "audio",
  "subtipo": "disparo",
  "latitud": -2.1709,
  "longitud": -79.5871,
  "confianza": 0.95,
  "severidad": 4,
  "fuente": "app_movil",
  "metadatos": {
    "modelo": "yamnet-mobile",
    "plataforma": "ios"
  }
}
```

Y transformarlo a `eventos.create`.

## Visualización de fotos (frontend)

`ms-core` no sirve archivos estáticos. Las imágenes se alojan en **Cloudinary**; el dashboard web (`webcentinela`) renderiza las URLs devueltas en `fotosUrls` y `evidenciaUrls`. Ver README del monorepo raíz y de `c-gateway` para el flujo de subida.

## Checklist de prueba

```text
1. Crear zona
2. Crear nodo movil con zonaId
3. Enviar heartbeat
4. Crear evento con nodoId, latitud y longitud
5. Verificar que el evento tenga zonaId
6. Verificar que se genere alerta si severidad >= 2 o subtipo critico
7. Reconocer y cerrar alerta
```
