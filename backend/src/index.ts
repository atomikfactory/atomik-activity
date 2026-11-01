import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import trackingRoutes from './routes/tracking';
import healthDataRoutes from './routes/health';

dotenv.config();

const fastify = Fastify({ logger: true });

async function build() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required but not set. Set it in the environment or in backend/.env (see backend/.env.example).');
    }

    await fastify.register(cors, { origin: '*' });

    await fastify.register(jwt, {
        secret: jwtSecret,
    });

    // Swagger spec
    await fastify.register(swagger, {
        openapi: {
            info: {
                title: 'Atomik Activity API',
                description: 'Location tracking backend — use /docs to explore',
                version: '1.0.0',
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
        },
    });

    // Swagger UI — open http://localhost:3000/docs in your browser
    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: { docExpansion: 'list', deepLinking: true },
    });

    fastify.register(authRoutes, { prefix: '/api/auth' });
    fastify.register(trackingRoutes, { prefix: '/api/tracking' });
    fastify.register(healthDataRoutes, { prefix: '/api/health' });

    fastify.get('/api/ping', async () => ({ status: 'ok' }));

    return fastify;
}

const start = async () => {
    try {
        const app = await build();
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:3000`);
        console.log(`Swagger UI:        http://localhost:3000/docs`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
