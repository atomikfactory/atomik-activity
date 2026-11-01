import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const authBody = {
    type: 'object',
    required: ['email', 'password'],
    properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
    },
};

const errorBody = {
    type: 'object',
    properties: {
        error: { type: 'string' },
    },
} as const;

const authResponse = {
    200: {
        type: 'object',
        properties: {
            token: { type: 'string' },
            user: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                },
            },
        },
    },
    400: errorBody,
    401: errorBody,
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post('/register', {
        schema: {
            tags: ['Auth'],
            summary: 'Register a new user',
            body: authBody,
            response: authResponse,
        }
    }, async (request, reply) => {
        const { email, password } = request.body as any;

        if (!email || !password) {
            return reply.code(400).send({ error: 'Email and password required' });
        }

        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length > 0) {
            return reply.code(400).send({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [user] = await db.insert(users).values({ email, passwordHash }).returning();

        const token = fastify.jwt.sign({ id: user.id, email: user.email });
        return reply.send({ token, user: { id: user.id, email: user.email } });
    });

    fastify.post('/login', {
        schema: {
            tags: ['Auth'],
            summary: 'Login with email + password, returns JWT',
            body: authBody,
            response: authResponse,
        }
    }, async (request, reply) => {
        const { email, password } = request.body as any;

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return reply.code(401).send({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return reply.code(401).send({ error: 'Invalid credentials' });

        const token = fastify.jwt.sign({ id: user.id, email: user.email });
        return reply.send({ token, user: { id: user.id, email: user.email } });
    });

    fastify.get('/me', {
        schema: {
            tags: ['Auth'],
            summary: 'Get current authenticated user',
            security: [{ bearerAuth: [] }],
        },
        onRequest: [async (request, reply) => {
            try { await request.jwtVerify() } catch (err) { reply.send(err) }
        }]
    }, async (request, reply) => {
        const userPayload = request.user as { id: string, email: string };
        const [user] = await db.select().from(users).where(eq(users.id, userPayload.id));
        if (!user) return reply.code(404).send({ error: 'User not found' });
        return reply.send({ id: user.id, email: user.email });
    });
};

export default authRoutes;
