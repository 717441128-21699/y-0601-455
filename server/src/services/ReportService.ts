import PDFDocument from 'pdfkit';
import { WeeklyReport } from '../models/WeeklyReport';
import { Candy } from '../models/Candy';
import { Contest } from '../models/Contest';
import { Trade } from '../models/Trade';
import { Player } from '../models/Player';
import { Material } from '../models/Material';
import { MaterialQuality } from '../config/constants';

export interface HeatmapPoint {
  hour: number;
  weekday: number;
  materialId: string;
  count: number;
}

export interface ReportSummary {
  totalCandiesMade: number;
  totalContests: number;
  totalTrades: number;
  totalTradeVolume: number;
  topMaterials: Array<{ materialId: string; name: string; usage: number }>;
  topCandies: Array<{ candyName: string; creator: string; score: number }>;
  topPlayers: Array<{ playerId: string; nickname: string; score: number; category: string }>;
  materialHeatmap: Array<{ hour: number; weekday: number; counts: Record<string, number> }>;
  contestScoreCurves: Array<{ timestamp: number; contestId: string; participantId: string; score: number }>;
  tradePriceTrends: Array<{ date: string; itemKey: string; avgPrice: number; volume: number; high: number; low: number }>;
}

export class ReportService {
  static async generateWeeklyReport(startDate?: Date, endDate?: Date): Promise<any> {
    const now = new Date();
    const end = endDate || now;
    const start = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      candies,
      contests,
      trades,
      materials,
      players,
    ] = await Promise.all([
      Candy.find({ createdAt: { $gte: start, $lte: end } }),
      Contest.find({ createdAt: { $gte: start, $lte: end } }),
      Trade.find({ completedAt: { $gte: start, $lte: end }, status: 'completed' }),
      Material.find(),
      Player.find(),
    ]);

    const materialUsage = new Map<string, number>();
    const heatmapMap = new Map<string, Record<string, number>>();

    for (const candy of candies) {
      const date = new Date(candy.createdAt);
      const hour = date.getHours();
      const weekday = date.getDay();
      const key = `${hour}_${weekday}`;

      if (!heatmapMap.has(key)) heatmapMap.set(key, {});
      const slot = heatmapMap.get(key)!;

      for (const ing of candy.ingredients) {
        const mid = ing.materialId.toString();
        materialUsage.set(mid, (materialUsage.get(mid) || 0) + ing.quantity);
        slot[mid] = (slot[mid] || 0) + ing.quantity;
      }
    }

    const materialHeatmap = Array.from(heatmapMap.entries()).map(([key, counts]) => {
      const [h, w] = key.split('_').map(Number);
      return { hour: h, weekday: w, counts };
    });

    const contestScoreCurves: any[] = [];
    for (const c of contests) {
      for (const entry of c.scoreHistory) {
        for (const [pid, score] of Object.entries((entry.scores as any) || {})) {
          contestScoreCurves.push({
            timestamp: new Date(entry.timestamp).getTime(),
            contestId: c._id.toString(),
            participantId: pid,
            score,
          });
        }
      }
    }

    const tradeMap = new Map<string, Array<{ price: number; date: string }>>();
    for (const t of trades) {
      const key = `${t.itemType}_${t.candyId?.toString() || t.recipeId?.toString()}`;
      if (!tradeMap.has(key)) tradeMap.set(key, []);
      tradeMap.get(key)!.push({
        price: t.askingPrice,
        date: new Date(t.completedAt!).toISOString().split('T')[0],
      });
    }

    const tradePriceTrends: any[] = [];
    for (const [itemKey, entries] of tradeMap.entries()) {
      const byDate = new Map<string, number[]>();
      for (const e of entries) {
        if (!byDate.has(e.date)) byDate.set(e.date, []);
        byDate.get(e.date)!.push(e.price);
      }
      for (const [date, prices] of byDate.entries()) {
        const sorted = [...prices].sort((a, b) => a - b);
        tradePriceTrends.push({
          date,
          itemKey,
          avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
          volume: prices.length,
          high: sorted[sorted.length - 1],
          low: sorted[0],
        });
      }
    }

    const topMaterials = Array.from(materialUsage.entries())
      .map(([mid, usage]) => ({
        materialId: mid,
        name: materials.find(m => m._id.toString() === mid)?.name || mid,
        usage,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    const topCandies = [...candies]
      .sort((a, b) => b.rarityScore - a.rarityScore)
      .slice(0, 10)
      .map(c => ({
        candyName: c.name,
        creator: players.find(p => p._id.toString() === c.creatorId.toString())?.nickname || '未知',
        score: c.rarityScore,
      }));

    const topPlayers = [
      ...[...players].sort((a, b) => (b.collectionScore || 0) - (a.collectionScore || 0)).slice(0, 5).map(p => ({
        playerId: p._id.toString(), nickname: p.nickname, score: p.collectionScore || 0, category: '收藏度',
      })),
      ...[...players].sort((a, b) => (b.contestScore || 0) - (a.contestScore || 0)).slice(0, 5).map(p => ({
        playerId: p._id.toString(), nickname: p.nickname, score: p.contestScore || 0, category: '大赛积分',
      })),
      ...[...players].sort((a, b) => (b.guildContribution || 0) - (a.guildContribution || 0)).slice(0, 5).map(p => ({
        playerId: p._id.toString(), nickname: p.nickname, score: p.guildContribution || 0, category: '公会贡献',
      })),
    ];

    const report = new WeeklyReport({
      weekStart: start,
      weekEnd: end,
      totalCandiesMade: candies.length,
      totalContests: contests.length,
      totalTrades: trades.length,
      totalTradeVolume: trades.reduce((s, t) => s + t.askingPrice, 0),
      materialUsageHeatmap: materialHeatmap,
      contestScoreCurves,
      tradePriceTrends,
      topMaterials,
      topCandies,
      topPlayers,
    });
    await report.save();

    return report;
  }

  static async getLatestReport() {
    return WeeklyReport.findOne().sort({ generatedAt: -1 });
  }

  static async getReportHistory(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      WeeklyReport.find().sort({ generatedAt: -1 }).skip(skip).limit(limit),
      WeeklyReport.countDocuments(),
    ]);
    return { reports, total, page, limit };
  }

  static generateReportPDF(report: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(24).fillColor('#FF69B4').text('🍬 糖果产业周报', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#333').text(`报告周期: ${new Date(report.weekStart).toLocaleDateString()} - ${new Date(report.weekEnd).toLocaleDateString()}`);
      doc.moveDown(1);

      doc.fontSize(16).fillColor('#FF1493').text('📊 本周数据概览');
      doc.moveDown(0.5);
      const overview = [
        ['总制作糖果数', report.totalCandiesMade.toString()],
        ['举办大赛数', report.totalContests.toString()],
        ['完成交易数', report.totalTrades.toString()],
        ['总交易金额', report.totalTradeVolume.toLocaleString() + ' 金币'],
      ];
      overview.forEach(([k, v]) => {
        doc.fontSize(11).text(`${k}: ${v}`, { indent: 20 });
      });

      doc.moveDown(1);
      doc.fontSize(16).fillColor('#FF1493').text('🏆 本周TOP10原料');
      doc.moveDown(0.5);
      report.topMaterials.forEach((m: any, i: number) => {
        doc.fontSize(11).fillColor('#333').text(
          `${i + 1}. ${m.name} - 使用量: ${m.usage}`,
          { indent: 20 }
        );
      });

      doc.moveDown(1);
      doc.fontSize(16).fillColor('#FF1493').text('⭐ 本周TOP10糖果');
      doc.moveDown(0.5);
      report.topCandies.forEach((c: any, i: number) => {
        doc.fontSize(11).fillColor('#333').text(
          `${i + 1}. ${c.candyName} (作者: ${c.creator}) - 稀有度: ${c.score}`,
          { indent: 20 }
        );
      });

      doc.moveDown(1);
      doc.fontSize(16).fillColor('#FF1493').text('🎖 排行榜之星');
      doc.moveDown(0.5);
      report.topPlayers.forEach((p: any, i: number) => {
        doc.fontSize(11).fillColor('#333').text(
          `${i + 1}. ${p.nickname} [${p.category}] - 分数: ${p.score}`,
          { indent: 20 }
        );
      });

      doc.addPage();
      doc.fontSize(20).fillColor('#FF69B4').text('📈 趋势与统计', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(14).fillColor('#FF1493').text('原料使用热力图数据');
      doc.moveDown(0.5);
      const heatmapSample = report.materialUsageHeatmap.slice(0, 5);
      heatmapSample.forEach((h: any) => {
        const materials = Object.entries(h.counts).map(([k, v]) => `${k}:${v}`).join(', ').slice(0, 80);
        doc.fontSize(9).text(
          `周${h.weekday} ${h.hour}:00 - ${materials || '(无数据)'}`,
          { indent: 10 }
        );
      });

      doc.moveDown(1);
      doc.fontSize(14).fillColor('#FF1493').text('交易价格走势');
      doc.moveDown(0.5);
      const trendSample = report.tradePriceTrends.slice(0, 8);
      trendSample.forEach((t: any) => {
        doc.fontSize(9).text(
          `${t.date} | ${t.itemKey.slice(0, 15)} | 均价:${t.avgPrice} 最高:${t.high} 最低:${t.low} 量:${t.volume}`,
          { indent: 10 }
        );
      });

      doc.moveDown(2);
      doc.fontSize(10).fillColor('#888').text(
        'Generated by Magic Candy Workshop System - 魔法糖果工坊',
        { align: 'center' }
      );

      doc.end();
    });
  }
}
