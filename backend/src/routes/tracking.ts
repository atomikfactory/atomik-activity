import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { points } from '../db/schema';
import { sql } from 'drizzle-orm';

const trackingRoutes: FastifyPluginAsync = async (fastify, opts) => {
    fastify.post('/batch', {
        onRequest: [async (request, reply) => {
            try {
                await request.jwtVerify()
            } catch (err) {
                reply.send(err)
            }
        }]
    }, async (request, reply) => {
        const userPayload = request.user as { id: string, email: string };
        const { items } = request.body as any;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return reply.code(400).send({ error: 'Valid items array required' });
        }

        const pointsToInsert = items.map((p: any) => ({
            userId: userPayload.id,
            latitude: p.latitude,
            longitude: p.longitude,
            // Map incoming timestamp to a valid Date object if its a number or ISO string
            timestamp: new Date(p.timestamp),
            accuracy: p.accuracy || null,
            altitude: p.altitude || null,
            speed: p.speed || null,
            heading: p.heading || null,
            activityType: p.activityType || null,
        }));

        try {
            // Drizzle handles multiple inserts out of the box. 
            // We will loop slightly to apply the Postgis geometry creation manually per row
            // We perform raw queries here for PostGIS, or wait for Drizzle insert then update

            const inserted = await db.transaction(async (tx) => {
                const rows = await tx.insert(points).values(pointsToInsert).returning({ id: points.id, latitude: points.latitude, longitude: points.longitude });

                // PostGIS Geography update
                for (const row of rows) {
                    await tx.execute(sql`
                UPDATE points 
                SET location = ST_SetSRID(ST_MakePoint(${row.longitude}, ${row.latitude}), 4326) 
                WHERE id = ${row.id};
              `);
                }
                // Let's implement background logic for Trip/Stop detection.
                // We will do a generic proximity check. If the last N points are within 50m of each other,
                // and over 5 mins have passed, it's a stop.

                const lastTrip = await tx.execute(sql`
           SELECT * FROM trips WHERE "user_id" = ${userPayload.id} ORDER BY "start_time" DESC LIMIT 1;
        `);
                // Basic trip logic omitted for brevity here without a full timeseries streaming engine.
                // The idea is:
                // 1. Group points by time gap > 5 mins AND distance < 50m = Stop
                // 2. Continuous movement > 200m = Trip
                // For production, this is usually an async job (e.g., BullMQ) running over the raw points.
                // We return success of ingestion directly.

                return rows.length;
            });

            return reply.send({ success: true, count: inserted });
        } catch (e: any) {
            fastify.log.error(e);
            return reply.code(500).send({ error: "Failed to batch insert points" });
        }
    });

    // Endpoints for Dashboard timeline
    fastify.get('/daily', {
        onRequest: [async (request, reply) => {
            try {
                await request.jwtVerify()
            } catch (err) {
                reply.send(err)
            }
        }]
    }, async (request, reply) => {
        const userPayload = request.user as { id: string, email: string };
        const { date } = request.query as { date: string }; // YYYY-MM-DD

        if (!date) return reply.code(400).send({ error: 'Date required YYYY-MM-DD' });

        // Fetch trips for that date, points for that date
        const dailyPoints = await db.execute(sql`
        SELECT "id", "latitude", "longitude", "timestamp" 
        FROM points 
        WHERE "user_id" = ${userPayload.id} 
        AND DATE("timestamp") = ${date}
        ORDER BY "timestamp" ASC;
    `);

        return reply.send({
            date,
            pointsCount: dailyPoints.rows.length,
            points: dailyPoints.rows
        });
    });
};

export default trackingRoutes;
