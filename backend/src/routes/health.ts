import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { healthStepsDaily, sleepSessions } from '../db/schema';
import { sql } from 'drizzle-orm';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
    const jwtGuard = async (request: any, reply: any) => {
        try { await request.jwtVerify(); } catch (err) { reply.send(err); }
    };

    // POST /api/health/batch — upsert steps + sleep aggregates from the device
    fastify.post('/batch', { onRequest: [jwtGuard] }, async (request, reply) => {
        const user = request.user as { id: string; email: string };
        const { steps = [], sleep = [] } = request.body as any;

        let stepsCount = 0;
        let sleepCount = 0;

        try {
            await db.transaction(async (tx) => {
                // Upsert steps — one row per (user, date), update on conflict
                for (const s of steps) {
                    if (!s.date || s.steps == null) continue;
                    await tx.execute(sql`
                        INSERT INTO health_steps_daily (id, user_id, date, steps, source, updated_at)
                        VALUES (gen_random_uuid(), ${user.id}, ${s.date}, ${s.steps}, ${s.source ?? null}, NOW())
                        ON CONFLICT ON CONSTRAINT health_steps_daily_user_date_unique
                        DO UPDATE SET steps = EXCLUDED.steps, source = EXCLUDED.source, updated_at = NOW()
                    `);
                    stepsCount++;
                }

                // Upsert sleep — one row per (user, external_id), skip on conflict
                for (const sl of sleep) {
                    if (!sl.externalId || !sl.startTime || !sl.endTime) continue;
                    await tx.execute(sql`
                        INSERT INTO sleep_sessions
                          (id, user_id, external_id, start_time, end_time, duration_min, stages, source, created_at)
                        VALUES (
                            gen_random_uuid(), ${user.id}, ${sl.externalId},
                            ${sl.startTime}::timestamptz, ${sl.endTime}::timestamptz,
                            ${sl.durationMin}, ${sl.stages ? JSON.stringify(sl.stages) : null}::jsonb,
                            ${sl.source ?? null}, NOW()
                        )
                        ON CONFLICT ON CONSTRAINT sleep_sessions_user_ext_unique DO NOTHING
                    `);
                    sleepCount++;
                }
            });

            return reply.send({ success: true, stepsCount, sleepCount });
        } catch (e: any) {
            fastify.log.error(e);
            return reply.code(500).send({ error: 'Failed to upsert health data' });
        }
    });

    // GET /api/health/daily?date=YYYY-MM-DD
    fastify.get('/daily', { onRequest: [jwtGuard] }, async (request, reply) => {
        const user = request.user as { id: string; email: string };
        const { date } = request.query as { date?: string };

        if (!date) return reply.code(400).send({ error: 'date required (YYYY-MM-DD)' });

        const stepsRows = await db.execute(sql`
            SELECT steps, source FROM health_steps_daily
            WHERE user_id = ${user.id} AND date = ${date}
            LIMIT 1
        `);

        // "Last night's sleep" = most recent session whose end_time falls on this date
        const sleepRows = await db.execute(sql`
            SELECT external_id, start_time, end_time, duration_min, stages, source
            FROM sleep_sessions
            WHERE user_id = ${user.id} AND DATE(end_time AT TIME ZONE 'UTC') = ${date}::date
            ORDER BY end_time DESC
            LIMIT 1
        `);

        return reply.send({
            date,
            steps: stepsRows.rows[0]?.steps ?? null,
            stepsSource: stepsRows.rows[0]?.source ?? null,
            sleep: sleepRows.rows[0] ?? null,
        });
    });
};

export default healthRoutes;
