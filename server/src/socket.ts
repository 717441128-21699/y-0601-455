import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ContestService } from './services/ContestService';
import { TradeService } from './services/TradeService';
import { GlobalState } from './models/GlobalState';
import { Player } from './models/Player';
import jwt from 'jsonwebtoken';

interface PlayerSocket {
  playerId: string;
  socket: Socket;
  joinedContest?: string;
}

const connectedPlayers = new Map<string, PlayerSocket>();

export const initSocketIO = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('未认证'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'magic-candy-secret-key-2024') as any;
      (socket as any).playerId = decoded.playerId;
      next();
    } catch (e) {
      next(new Error('认证失败'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const playerId = (socket as any).playerId;
    connectedPlayers.set(socket.id, { playerId, socket });

    Player.findByIdAndUpdate(playerId, { lastLoginAt: new Date() }).exec();

    socket.on('disconnect', async () => {
      connectedPlayers.delete(socket.id);
      const online = await updateOnlineCount();
      io.emit('online_count', { count: online });
    });

    socket.on('join_contest', async (contestId: string) => {
      const ps = connectedPlayers.get(socket.id);
      if (ps) {
        ps.joinedContest = contestId;
        socket.join(`contest:${contestId}`);
      }
    });

    socket.on('leave_contest', async (contestId: string) => {
      const ps = connectedPlayers.get(socket.id);
      if (ps) {
        ps.joinedContest = undefined;
        socket.leave(`contest:${contestId}`);
      }
    });

    socket.on('contest_use_skill', async ({ contestId, skillType }: { contestId: string; skillType: 'sugar_boost' | 'decoration' }) => {
      try {
        let result;
        if (skillType === 'sugar_boost') {
          result = await ContestService.useSugarBoost(contestId, playerId);
        } else {
          result = await ContestService.useDecoration(contestId, playerId);
        }
        socket.emit('skill_result', result);
        if (result.success) {
          const updated = await ContestService.updateContestScores(contestId);
          if (updated) {
            io.to(`contest:${contestId}`).emit('contest_updated', {
              participants: updated.participants,
              events: updated.events.slice(-10),
              scoreHistory: updated.scoreHistory.slice(-50),
            });
          }
        }
      } catch (err) {
        socket.emit('skill_result', { success: false, message: '技能使用失败' });
      }
    });

    socket.on('contest_refresh', async (contestId: string) => {
      try {
        const updated = await ContestService.updateContestScores(contestId);
        if (updated) {
          socket.emit('contest_updated', {
            participants: updated.participants,
            events: updated.events.slice(-20),
            scoreHistory: updated.scoreHistory.slice(-50),
          });
        }
      } catch (e) { /* ignore */ }
    });
  });

  setInterval(async () => {
    try {
      const now = new Date();
      const active = await ContestService.getActiveContest();
      if (active && active.status !== 'completed') {
        if (active.startTime <= now && active.status === 'scheduled') {
          active.status = 'ongoing';
          await active.save();
          broadcastToAll(io, 'contest_started', { contestId: active._id, title: active.title });
        }
        const updated = await ContestService.updateContestScores(active._id.toString());
        if (updated) {
          io.to(`contest:${active._id}`).emit('contest_updated', {
            participants: updated.participants,
            events: updated.events.slice(-20),
            scoreHistory: updated.scoreHistory.slice(-50),
          });
        }
        if (active.endTime <= now && active.status === 'ongoing') {
          const result = await ContestService.finalizeContest(active._id.toString());
          if (result.success) {
            broadcastToAll(io, 'contest_ended', { contestId: active._id, results: result.results });
          }
        }
      }

      const gs = await GlobalState.findOne({ key: 'global' });
      if (gs && gs.candyFestival.active && gs.candyFestival.endsAt && new Date(gs.candyFestival.endsAt) < now) {
        gs.candyFestival.active = false;
        gs.lastUpdated = new Date();
        await gs.save();
        broadcastToAll(io, 'festival_ended', {});
      }
    } catch (e) { /* ignore */ }
  }, 5000);

  setInterval(async () => {
    const online = await updateOnlineCount();
    broadcastToAll(io, 'online_count', { count: online });
  }, 15000);

  return io;
};

async function updateOnlineCount(): Promise<number> {
  const online = new Set(Array.from(connectedPlayers.values()).map(p => p.playerId)).size;
  await GlobalState.findOneAndUpdate(
    { key: 'global' },
    { $set: { 'serverStats.onlinePlayers': online, lastUpdated: new Date() } },
    { upsert: true }
  );
  return online;
}

function broadcastToAll(io: SocketIOServer, event: string, data: any) {
  io.emit(event, data);
}

export const notifyNewTrade = async (io: SocketIOServer, trade: any, buyerNickname: string, festivalTriggered: boolean) => {
  const seller = await Player.findById(trade.sellerId).select('nickname');
  io.emit('trade_completed', {
    tradeId: trade._id,
    itemType: trade.itemType,
    seller: seller?.nickname || '未知',
    buyer: buyerNickname,
    price: trade.askingPrice,
    festivalTriggered,
    timestamp: new Date(),
  });
  if (festivalTriggered) {
    io.emit('candy_festival_started', {
      triggeredBy: buyerNickname,
      critBonus: parseFloat(process.env.CANDY_FESTIVAL_CRIT_BONUS || '0.3'),
      endsAt: new Date().setHours(23, 59, 59, 999),
    });
  }
};

export const notifyFestivalStart = (io: SocketIOServer, data: any) => {
  io.emit('candy_festival_started', data);
};

export const getSocketServer = (() => {
  let instance: SocketIOServer | null = null;
  return {
    set: (io: SocketIOServer) => { instance = io; },
    get: () => instance,
  };
})();
