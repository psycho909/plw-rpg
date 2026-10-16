import type { ContentPack } from '../../domain/content'

/** Phase 7-G crop and crop-good data. Pack registration is owned by integration. */
export const FARM_CROP_CONTENT: ContentPack = {
  families: [],
  monsters: [],
  lootTables: [],
  equipment: [],
  materials: [],
  crops: [
    {
      id: 'spring_pea', name: { 'zh-TW': '豌豆' }, description: { 'zh-TW': '春季短週期作物，收成少而成熟迅速。' },
      regions: ['farmland'], seasons: ['春'], growthMinutes: 720, harvestAmount: 4, harvestGoodId: 'spring_pea_good',
    },
    {
      id: 'field_turnip', name: { 'zh-TW': '田蕪菁' }, description: { 'zh-TW': '春秋皆可栽種，一日成熟且收量穩定。' },
      regions: ['farmland'], seasons: ['春', '秋'], growthMinutes: 1440, harvestAmount: 6, harvestGoodId: 'field_turnip_good',
    },
    {
      id: 'summer_barley', name: { 'zh-TW': '夏大麥' }, description: { 'zh-TW': '夏季大宗作物，以較長生長時間換取更多收成。' },
      regions: ['farmland'], seasons: ['夏'], growthMinutes: 2880, harvestAmount: 8, harvestGoodId: 'summer_barley_good',
    },
    {
      id: 'sun_pepper', name: { 'zh-TW': '日照椒' }, description: { 'zh-TW': '夏日成熟的椒果，收量不多但滋味濃厚。' },
      regions: ['farmland'], seasons: ['夏'], growthMinutes: 2160, harvestAmount: 4, harvestGoodId: 'sun_pepper_good',
    },
    {
      id: 'forest_bean', name: { 'zh-TW': '林豆' }, description: { 'zh-TW': '夏秋皆能生長，適合穩定供應中期糧食。' },
      regions: ['farmland'], seasons: ['夏', '秋'], growthMinutes: 2880, harvestAmount: 6, harvestGoodId: 'forest_bean_good',
    },
    {
      id: 'autumn_pumpkin', name: { 'zh-TW': '秋南瓜' }, description: { 'zh-TW': '需要耐心照料的秋季作物，成熟後收量豐厚。' },
      regions: ['farmland'], seasons: ['秋'], growthMinutes: 5760, harvestAmount: 10, harvestGoodId: 'autumn_pumpkin_good',
    },
    {
      id: 'orchard_apple', name: { 'zh-TW': '果園蘋果' }, description: { 'zh-TW': '秋季收成的果實，兼顧食用與交易價值。' },
      regions: ['farmland'], seasons: ['秋'], growthMinutes: 2880, harvestAmount: 5, harvestGoodId: 'orchard_apple_good',
    },
    {
      id: 'winter_cabbage', name: { 'zh-TW': '冬甘藍' }, description: { 'zh-TW': '冬季三日成熟的耐寒蔬菜，能提供充足糧食。' },
      regions: ['farmland'], seasons: ['冬'], growthMinutes: 4320, harvestAmount: 6, harvestGoodId: 'winter_cabbage_good',
    },
    {
      id: 'frost_root', name: { 'zh-TW': '霜根' }, description: { 'zh-TW': '冬季緩慢生長的根菜，收量較少但飽足感高。' },
      regions: ['farmland'], seasons: ['冬'], growthMinutes: 5760, harvestAmount: 5, harvestGoodId: 'frost_root_good',
    },
    {
      id: 'marsh_rice', name: { 'zh-TW': '濕地稻' }, description: { 'zh-TW': '夏秋生長的長週期作物，成熟時可收穫一批稻穗。' },
      regions: ['farmland'], seasons: ['夏', '秋'], growthMinutes: 5760, harvestAmount: 8, harvestGoodId: 'marsh_rice_good',
    },
    {
      id: 'cave_mushroom', name: { 'zh-TW': '洞菇' }, description: { 'zh-TW': '春秋冬皆可栽種，成熟較慢而單份營養豐足。' },
      regions: ['farmland'], seasons: ['春', '秋', '冬'], growthMinutes: 4320, harvestAmount: 4, harvestGoodId: 'cave_mushroom_good',
    },
  ],
  cropGoods: [
    {
      id: 'spring_pea_good', name: { 'zh-TW': '豌豆莢' }, description: { 'zh-TW': '豌豆成熟後採下的新鮮豆莢。' },
      sourceCropId: 'spring_pea', foodValue: 1, sell: 2,
    },
    {
      id: 'field_turnip_good', name: { 'zh-TW': '蕪菁' }, description: { 'zh-TW': '田蕪菁成熟後收成的根菜。' },
      sourceCropId: 'field_turnip', foodValue: 1, sell: 3,
    },
    {
      id: 'summer_barley_good', name: { 'zh-TW': '大麥束' }, description: { 'zh-TW': '夏大麥收成後整理成束的穀物。' },
      sourceCropId: 'summer_barley', foodValue: 1, sell: 4,
    },
    {
      id: 'sun_pepper_good', name: { 'zh-TW': '紅椒' }, description: { 'zh-TW': '日照椒成熟後採下的紅色椒果。' },
      sourceCropId: 'sun_pepper', foodValue: 2, sell: 5,
    },
    {
      id: 'forest_bean_good', name: { 'zh-TW': '林豆莢' }, description: { 'zh-TW': '林豆成熟後採收的飽滿豆莢。' },
      sourceCropId: 'forest_bean', foodValue: 2, sell: 6,
    },
    {
      id: 'autumn_pumpkin_good', name: { 'zh-TW': '南瓜' }, description: { 'zh-TW': '秋南瓜完全成熟後收成的果實。' },
      sourceCropId: 'autumn_pumpkin', foodValue: 2, sell: 7,
    },
    {
      id: 'orchard_apple_good', name: { 'zh-TW': '蘋果' }, description: { 'zh-TW': '果園蘋果成熟後採下的秋季果實。' },
      sourceCropId: 'orchard_apple', foodValue: 2, sell: 8,
    },
    {
      id: 'winter_cabbage_good', name: { 'zh-TW': '甘藍' }, description: { 'zh-TW': '冬甘藍收成的緊實菜葉，可補充糧食。' },
      sourceCropId: 'winter_cabbage', foodValue: 3, sell: 9,
    },
    {
      id: 'frost_root_good', name: { 'zh-TW': '霜根塊' }, description: { 'zh-TW': '霜根成熟後收成的根塊，單份營養豐富。' },
      sourceCropId: 'frost_root', foodValue: 3, sell: 10,
    },
    {
      id: 'marsh_rice_good', name: { 'zh-TW': '稻穗' }, description: { 'zh-TW': '濕地稻成熟後收成的穀穗。' },
      sourceCropId: 'marsh_rice', foodValue: 3, sell: 11,
    },
    {
      id: 'cave_mushroom_good', name: { 'zh-TW': '洞菇' }, description: { 'zh-TW': '洞菇成熟後採下的菌菇，單份營養充足。' },
      sourceCropId: 'cave_mushroom', foodValue: 3, sell: 12,
    },
  ],
  recipes: [],
  affixes: [],
}
