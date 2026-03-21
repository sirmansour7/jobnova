import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8080),
  ALLOWED_ORIGINS: Joi.string().required(),
  RESEND_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  SENTRY_DSN: Joi.string().uri().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  BACKEND_URL: Joi.string().uri().optional(),
});
