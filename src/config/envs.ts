import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVICE: string;
  ALERT_DEDUP_WINDOW_SEC?: number;
  ALERT_SINGLE_NODE_BYPASS?: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVICE: joi.string().required(),
    ALERT_DEDUP_WINDOW_SEC: joi.number().min(10).max(600).default(60),
    ALERT_SINGLE_NODE_BYPASS: joi
      .string()
      .valid('true', 'false', '1', '0', 'yes', 'no')
      .default('true'),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
});

if (error) {
  throw new Error(`Error en la configuracion de la validacion ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  natsServers: [envVars.NATS_SERVICE],
  alertDedupWindowSec: envVars.ALERT_DEDUP_WINDOW_SEC ?? 60,
  alertSingleNodeBypass: ['true', '1', 'yes'].includes(
    String(envVars.ALERT_SINGLE_NODE_BYPASS ?? 'true').toLowerCase(),
  ),
};
