import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { SignJWT, jwtVerify } from 'jose';
import { MongoClient, ObjectId } from 'mongodb';
import { z } from 'zod';

const required = ['MONGODB_URI', 'JWT_SECRET'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required; copy .env.example to .env and set it outside git.`);
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI.startsWith('mongodb+srv://') && !process.env.MONGODB_URI.includes('tls=true')) throw new Error('Production MongoDB connections must use TLS.');

const app = express();
const port = Number(process.env.PORT || 8787);
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DB || 'rootledger');
const jwtKey = new TextEncoder().encode(process.env.JWT_SECRET);

const configuredOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
const allowedOrigin = (origin, callback) => {
  // Vite chooses the next free localhost port during development. Production accepts only WEB_ORIGIN.
  if (!origin || origin === configuredOrigin || (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))) return callback(null, true);
  return callback(new Error('Origin is not allowed by RootLedger Community API.'));
};
app.use(helmet());
app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '16kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }));

const email = z.string().email().max(254).transform((value) => value.toLowerCase());
const authSchema = z.object({ email, password: z.string().min(12).max(128), displayName: z.string().trim().min(2).max(40) });
const loginSchema = authSchema.pick({ email: true, password: true });
const locationSchema = z.object({ consent: z.literal(true), shareWithCommunity: z.boolean(), shareWithResponders: z.boolean(), liveLocationSharing: z.boolean().default(false), location: z.object({ longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90), accuracyM: z.number().min(0).max(50_000) }) });
const coarse = (value) => Math.round(value * 1_000) / 1_000; // roughly 100m precision, not exact browser coordinates

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}
async function tokenFor(user) { return new SignJWT({ email: user.email, name: user.displayName }).setProtectedHeader({ alg: 'HS256' }).setSubject(user._id.toString()).setIssuedAt().setExpirationTime('15m').sign(jwtKey); }
async function requireUser(req, res, next) {
  try {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new Error('Missing access token');
    const { payload } = await jwtVerify(token, jwtKey);
    req.userId = new ObjectId(payload.sub);
    next();
  } catch { res.status(401).json({ error: 'Authentication required.' }); }
}

app.get('/health', async (_req, res) => { await db.command({ ping: 1 }); res.json({ ok: true }); });
app.post('/api/auth/register', async (req, res, next) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a display name, valid email, and password of at least 12 characters.' });
  const citizen = { email: parsed.data.email, displayName: parsed.data.displayName, passwordHash: hashPassword(parsed.data.password), createdAt: new Date() };
  try {
    const result = await db.collection('citizens').insertOne(citizen);
    res.status(201).json({ accessToken: await tokenFor({ ...citizen, _id: result.insertedId }), citizen: { id: result.insertedId.toString(), displayName: citizen.displayName } });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' }); next(error); }
});
app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email or password.' });
  const citizen = await db.collection('citizens').findOne({ email: parsed.data.email });
  if (!citizen || !verifyPassword(parsed.data.password, citizen.passwordHash)) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ accessToken: await tokenFor(citizen), citizen: { id: citizen._id.toString(), displayName: citizen.displayName } });
});
app.post('/api/citizens/location-consent', requireUser, async (req, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Explicit consent and a valid location are required.' });
  const { location, shareWithCommunity, shareWithResponders, liveLocationSharing } = parsed.data;
  const now = new Date();
  await db.collection('citizenLocations').updateOne({ citizenId: req.userId }, { $set: { citizenId: req.userId, geo: { type: 'Point', coordinates: [coarse(location.longitude), coarse(location.latitude)] }, accuracyM: Math.round(location.accuracyM), shareWithCommunity, shareWithResponders, liveLocationSharing, consentedAt: now, updatedAt: now, expiresAt: new Date(now.getTime() + 30 * 86400000) } }, { upsert: true });
  res.status(204).end();
});
app.delete('/api/citizens/location-consent', requireUser, async (req, res) => {
  await db.collection('citizenLocations').deleteOne({ citizenId: req.userId });
  await db.collection('connectionRequests').deleteMany({ $or: [{ fromCitizenId: req.userId }, { toCitizenId: req.userId }] });
  res.status(204).end();
});
app.get('/api/community/nearby', requireUser, async (req, res) => {
  const own = await db.collection('citizenLocations').findOne({ citizenId: req.userId });
  if (!own) return res.status(409).json({ error: 'Location consent is needed before matching nearby help.' });
  const near = { $near: { $geometry: own.geo, $maxDistance: 5_000 } };
  const [services, neighbors] = await Promise.all([
    own.shareWithResponders ? db.collection('helpServices').find({ geo: near, active: true }).project({ name: 1, category: 1, relevance: 1, phone: 1 }).limit(8).toArray() : [],
    own.shareWithCommunity ? db.collection('citizenLocations').aggregate([{ $geoNear: { near: own.geo, key: 'geo', distanceField: 'distanceM', maxDistance: 3_000, query: { citizenId: { $ne: req.userId }, shareWithCommunity: true } } }, { $limit: 12 }, { $lookup: { from: 'citizens', localField: 'citizenId', foreignField: '_id', as: 'citizen' } }, { $unwind: '$citizen' }, { $project: { _id: '$citizen._id', displayName: '$citizen.displayName', distanceM: 1 } }]).toArray() : [],
  ]);
  res.json({ services: services.map((item) => ({ id: item._id.toString(), name: item.name, category: item.category, relevance: item.relevance, phone: item.phone })), community: neighbors.map((item) => ({ memberId: item._id.toString(), displayName: item.displayName, distanceBand: item.distanceM < 1000 ? 'within 1 km' : 'within 3 km', connection: 'request required' })) });
});
app.post('/api/community/connection-requests', requireUser, async (req, res) => {
  const parsed = z.object({ memberId: z.string().regex(/^[a-f\d]{24}$/i) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid community member.' });
  const toCitizenId = new ObjectId(parsed.data.memberId);
  if (toCitizenId.equals(req.userId)) return res.status(400).json({ error: 'You cannot connect with yourself.' });
  const target = await db.collection('citizenLocations').findOne({ citizenId: toCitizenId, shareWithCommunity: true });
  if (!target) return res.status(404).json({ error: 'This member is not available for connection requests.' });
  await db.collection('connectionRequests').updateOne({ fromCitizenId: req.userId, toCitizenId }, { $setOnInsert: { fromCitizenId: req.userId, toCitizenId, status: 'pending', createdAt: new Date() } }, { upsert: true });
  res.status(201).json({ status: 'pending' });
});
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Unexpected server error.' }); });

async function start() {
  await client.connect();
  await Promise.all([db.collection('citizens').createIndex({ email: 1 }, { unique: true }), db.collection('citizenLocations').createIndex({ citizenId: 1 }, { unique: true }), db.collection('citizenLocations').createIndex({ geo: '2dsphere' }), db.collection('citizenLocations').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), db.collection('helpServices').createIndex({ geo: '2dsphere' }), db.collection('connectionRequests').createIndex({ fromCitizenId: 1, toCitizenId: 1 }, { unique: true })]);
  app.listen(port, () => console.log(`RootLedger community API listening on :${port}`));
}
start().catch((error) => { console.error(error); process.exit(1); });
