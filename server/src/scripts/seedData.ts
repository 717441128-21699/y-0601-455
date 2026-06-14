import connectDB from '../config/database';
import { MaterialService } from '../services/MaterialService';
import { Player } from '../models/Player';
import bcrypt from 'bcryptjs';
import { WORKSHOP_STYLES } from '../config/constants';
import { Workshop } from '../models/Workshop';
import { Inventory } from '../models/Inventory';
import { GlobalState } from '../models/GlobalState';
import { PlayerHistory } from '../models/PlayerHistory';

const seed = async () => {
  await connectDB();
  console.log('🌱 开始播种初始数据...');

  const matCount = await MaterialService.seedMaterials();
  console.log(`   ✅ 原料: ${matCount} 种`);

  const existingChief = await Player.findOne({ isChief: true });
  if (!existingChief) {
    const salt = await bcrypt.genSalt(10);
    const chief = new Player({
      username: 'chief',
      email: 'chief@magic-candy.com',
      password: await bcrypt.hash('chief123', salt),
      nickname: '首席调糖师',
      avatar: '👑',
      isChief: true,
      apprenticeRank: 'master',
      level: 100,
      gold: 999999,
      skills: { taste: 99, technique: 99, creativity: 99 },
    });
    await chief.save();

    const ws = new Workshop({
      ownerId: chief._id, name: '首席糖果圣殿', style: WORKSHOP_STYLES[5],
      stations: {
        candyPot: { level: 10, name: '创世熬糖台' },
        mixingBowl: { level: 10, name: '永恒搅拌碗' },
        decorationTable: { level: 10, name: '神圣装饰台' },
      },
      level: 10,
    });
    await ws.save();

    await Inventory.create({
      playerId: chief._id,
      specialItems: [
        { itemId: 'sugar_paper', name: '试糖纸', description: '研发用', icon: '📜', type: 'sugar_paper', quantity: 9999 },
        { itemId: 'rare_dew', name: '稀有蜜露', description: '研发用', icon: '🫧', type: 'rare_dew', quantity: 9999 },
        { itemId: 'sugar_powder_consumable', name: '魔法糖粉', description: '大赛用', icon: '✨', type: 'consumable', quantity: 9999 },
        { itemId: 'decoration_kit', name: '装饰包', description: '大赛用', icon: '🎀', type: 'consumable', quantity: 9999 },
      ],
    });
    await PlayerHistory.create({ playerId: chief._id });
    console.log(`   ✅ 首席调糖师账号: chief / chief123`);
  }

  for (let i = 1; i <= 5; i++) {
    const username = `player${i}`;
    const existing = await Player.findOne({ username });
    if (existing) continue;

    const salt = await bcrypt.genSalt(10);
    const player = new Player({
      username,
      email: `${username}@magic-candy.com`,
      password: await bcrypt.hash('123456', salt),
      nickname: `测试玩家${i}号`,
      avatar: ['🍬', '🍭', '🍫', '🧁', '🎂'][i - 1],
      gold: 20000 + i * 5000,
      level: 5 + i,
      skills: { taste: 15 + i * 3, technique: 12 + i * 4, creativity: 18 + i * 2 },
    });
    await player.save();

    const style = WORKSHOP_STYLES[i % WORKSHOP_STYLES.length];
    const ws = new Workshop({
      ownerId: player._id,
      name: `玩家${i}的甜蜜工坊`,
      style,
      level: 2 + Math.floor(i / 2),
      stations: {
        candyPot: { level: 2 + i, name: `熬糖台 Lv.${2 + i}` },
        mixingBowl: { level: 1 + i, name: `搅拌碗 Lv.${1 + i}` },
        decorationTable: { level: 1 + Math.floor(i / 2), name: `装饰台 Lv.${1 + Math.floor(i / 2)}` },
      },
    });
    await ws.save();

    const allMats = await (await import('../models/Material')).Material.find();
    const materials: any[] = [];
    for (let j = 0; j < 15; j++) {
      const mat = allMats[Math.floor(Math.random() * allMats.length)];
      const existing = materials.find(m => m.materialId.toString() === mat._id.toString());
      if (existing) existing.quantity += 5 + Math.floor(Math.random() * 15);
      else materials.push({
        materialId: mat._id,
        name: mat.name,
        type: mat.type,
        quality: mat.quality,
        icon: mat.icon,
        quantity: 5 + Math.floor(Math.random() * 15),
      });
    }

    await Inventory.create({
      playerId: player._id,
      materials,
      specialItems: [
        { itemId: 'sugar_paper', name: '试糖纸', description: '研发用', icon: '📜', type: 'sugar_paper', quantity: 20 + i * 5 },
        { itemId: 'rare_dew', name: '稀有蜜露', description: '研发用', icon: '🫧', type: 'rare_dew', quantity: 5 + i * 2 },
        { itemId: 'sugar_powder_consumable', name: '魔法糖粉', description: '大赛用', icon: '✨', type: 'consumable', quantity: 10 + i },
        { itemId: 'decoration_kit', name: '装饰包', description: '大赛用', icon: '🎀', type: 'consumable', quantity: 8 + i },
      ],
    });
    await PlayerHistory.create({ playerId: player._id });
    console.log(`   ✅ 玩家账号: ${username} / 123456 (${player.nickname})`);
  }

  await GlobalState.findOneAndUpdate({ key: 'global' }, {}, { upsert: true });
  console.log('   ✅ 全局状态已初始化');

  console.log('\n🎉 初始数据播种完成！');
  console.log('\n📋 默认账号:');
  console.log('   👑 首席调糖师: chief / chief123');
  console.log('   🎮 测试玩家: player1~player5 / 123456');
  process.exit(0);
};

seed().catch(err => {
  console.error('播种失败:', err);
  process.exit(1);
});
