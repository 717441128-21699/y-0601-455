import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import connectDB from './config/database';
import { initSocketIO, getSocketServer } from './socket';
import { authRouter } from './routes/auth';
import { workshopRouter } from './routes/workshop';
import { candyRouter } from './routes/candy';
import { contestRouter } from './routes/contest';
import { tradeRouter } from './routes/trade';
import { guildRouter } from './routes/guild';
import { reportRouter } from './routes/report';

const app = express();
const server = http.createServer(app);

const io = initSocketIO(server);
getSocketServer.set(io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

connectDB();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/workshop', workshopRouter);
app.use('/api/candy', candyRouter);
app.use('/api/contest', contestRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/guild', guildRouter);
app.use('/api/report', reportRouter);

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ message: err.message || '服务器内部错误' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🍬 魔法糖果工坊服务启动于端口 ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Socket: ws://localhost:${PORT}`);
});
