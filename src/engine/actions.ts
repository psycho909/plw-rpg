import { ARCHETYPES, BOSS, BUILDINGS, CONFIG, CROP, DUNGEON, ITEMS, MONSTERS } from '../data/config'
import { ITEM_BASES, RARITIES, WOLF_MONSTERS } from '../data/rewards'
import type { GameState, ItemId, SkillId } from '../domain/types'
import { emit } from './events'
import { random } from './random'
import { changeReputation, recordLifeAction } from './identity'
import { MERCENARY_REPUTATION } from '../data/lifeRules'
import { npcCanWork, rememberNpc } from './npcLife'
import { recordHunt, recordLivingTrade, tradePriceMultiplier } from './livingEvents'
import { die, distance, gainExp, player, simulate, stageIndex, threatLevel } from './simulation'
import { canVisit } from './rewardActions'
import { awardWolfLoot } from './itemGeneration'
import { incomingDamage, playerAttackDamage } from './combatStats'
import { advanceWolfTurn, wolfAttackForTurn, wolfChargeHealing, wolfCombatPhase, wolfDefenseForTurn } from './wolfFamily'
import { recordRegionalChiefDefeat } from './regionalCrisis'

export { canVisit } from './rewardActions'
function cost(state: GameState, stamina: number, minutes: number, gold = 0) {
  const c = player(state)
  if (!c.isAlive || state.combat || state.dungeon.inDungeon) return '目前無法進行這項活動。'
  if (c.stamina < stamina) return '體力不足，請先回聚落休息。'
  if (c.gold < gold) return '金幣不足。'
  // Pay before time advances so daily wages only spend the remaining balance.
  c.gold -= gold; c.stamina -= stamina; simulate(state, minutes)
  state.life.director.lastPlayerActivity = state.worldTime
  return c.isAlive ? '' : '角色已離世，請選擇繼任者。'
}
export function farm(state: GameState, action: 'prepare' | 'plant' | 'harvest') {
  if (player(state).currentRegion !== 'farmland') return '請先前往東方農田。'
  if (action === 'prepare') {
    if (state.preparedPlots + state.crops.length >= CONFIG.maxPlots) return '四塊田都已使用，請先收割。'
    const error = cost(state, 6, 20); if (error) return error
    state.preparedPlots++; emit(state, 'crop.prepared', 'player', '翻整了一塊田，可以播種了。')
  } else if (action === 'plant') {
    if (!state.preparedPlots) return '請先整地，再播種。'
    const error = cost(state, 4, 10); if (error) return error
    state.preparedPlots--
    state.crops.push({ id: ++state.eventSequence, plantedAt: state.worldTime, growthDuration: CROP.duration, matureAt: state.worldTime + CROP.duration, status: 'growing' })
    gainExp(state, player(state), 5, 'farming'); emit(state, 'crop.planted', 'player', '播下小麥。兩日後即可收割。')
  } else {
    const crop = state.crops.find(c => c.status === 'mature'); if (!crop) return '小麥還沒成熟，讓世界時間繼續前進。'
    const error = cost(state, 4, 15); if (error) return error
    const yieldAmount = CROP.yield + player(state).skills.farming.level - 1
    player(state).inventory.food += yieldAmount; state.settlement.food = Math.min(100, state.settlement.food + 2)
    state.crops = state.crops.filter(c => c.id !== crop.id); gainExp(state, player(state), 15, 'farming')
    emit(state, 'crop.harvested', 'player', `收穫 ${yieldAmount} 份食物，耕作經驗增加。`)
  }
  recordLifeAction(state, 'farming')
  if (action === 'harvest') changeReputation(state, 1, '收成補充橡谷糧食')
  return ''
}
export function gather(state: GameState, kind: 'wood' | 'stone' | 'iron') {
  const c = player(state), region = kind === 'wood' ? 'forest' : 'mine', skill: SkillId = kind === 'wood' ? 'woodcutting' : 'mining'
  if (c.currentRegion !== region) return kind === 'wood' ? '請先前往北方森林。' : '請先前往灰石礦場。'
  const amount = 2 + Math.floor((c.skills[skill].level - 1) / 2)
  if (state.regions[region].remainingAmount < amount) return '資源暫時耗盡，隔日會恢復。'
  const error = cost(state, 10, Math.max(15, 45 - c.skills[skill].level * 2)); if (error) return error
  state.regions[region].remainingAmount -= amount; c.inventory[kind] += amount; c.gold += 4
  gainExp(state, c, 10, skill); emit(state, 'player.gathered', 'player', `取得 ${amount} 份${ITEMS[kind].name}，工作報酬 4 金幣。`)
  recordLifeAction(state, skill)
  return ''
}
export function rest(state: GameState, kind: 'rest' | 'inn' | 'tavern') {
  const c = player(state)
  if (kind === 'rest' && c.currentRegion !== 'village') return '請回聚落休息。'
  if (kind !== 'rest' && !canVisit(state, kind)) return '請在營業時間前往建築旁。'
  const gold = kind === 'inn' ? 8 : kind === 'tavern' ? 3 : 0
  const error = cost(state, 0, kind === 'inn' ? 480 : 60, gold); if (error) return error
  c.hp = Math.min(c.maxHp, c.hp + (kind === 'inn' ? c.maxHp : 15)); c.stamina = Math.min(c.maxStamina, c.stamina + (kind === 'inn' ? c.maxStamina : 35))
  emit(state, 'player.rested', 'player', kind === 'inn' ? '在旅店睡了一覺，生命與體力完全恢復。' : '休息後，你恢復了生命與體力。')
  return ''
}
export function trade(state: GameState, item: ItemId, buying: boolean) {
  const c = player(state), equipment = item === 'sword' || item === 'armor', shop = equipment ? 'blacksmith' : 'store'
  if (!canVisit(state, shop)) return `請在營業時間前往${BUILDINGS[shop].name}旁。`
  const definition = ITEMS[item], price = buyPrice(state, item)
  if (buying) {
    if (stageIndex(state) < definition.minStage) return '聚落尚未提供這項商品。'
    if (c.gold < price) return '金幣不足。'
    c.gold -= price; c.inventory[item]++
  } else {
    const equipped = c.equipment.weapon === item || c.equipment.armor === item
    if (c.inventory[item] <= (equipped ? 1 : 0)) return '沒有可出售的物品；已穿戴的裝備請先卸下。'
    c.inventory[item]--; c.gold += definition.sell; state.settlement.prosperity = Math.min(100, state.settlement.prosperity + .2)
  }
  recordLivingTrade(state, item, buying)
  simulate(state, 5); emit(state, 'player.traded', 'player', `${buying ? '購買' : '出售'}一份${definition.name}。`)
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}
export function buyPrice(state: GameState, item: ItemId) {
  return Math.ceil(ITEMS[item].price * (stageIndex(state) === 2 ? .8 : 1) * tradePriceMultiplier(state))
}
export function equip(state: GameState, item: 'sword' | 'armor') {
  const c = player(state)
  if (!c.isAlive || state.combat) return '目前無法更換裝備。'
  if (!c.inventory[item]) return '背包裡沒有這件裝備。'
  const slot = item === 'sword' ? 'weapon' : 'armor'; c.equipment[slot] = c.equipment[slot] === item ? null : item
  if (state.reward.equipped[c.id]) state.reward.equipped[c.id]![slot] = null
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}
export function hireTerms(state: GameState) {
  const reputation = state.life.characters[state.activeCharacterId]!.reputation
  return {
    hireCost: 20 + stageIndex(state) * 5 - Math.min(MERCENARY_REPUTATION.maximumDiscount, Math.floor(Math.max(0, reputation) / MERCENARY_REPUTATION.discountStep)),
    eligible: reputation >= MERCENARY_REPUTATION.minimum,
  }
}
export function hire(state: GameState, npcId: string) {
  if (!canVisit(state, 'tavern')) return '請在 17:00–24:00 前往酒館旁。'
  if (state.party.length >= 2) return '最多只能聘請兩名同行者。'
  const npc = state.npcs.find(n => n.id === npcId && n.job === 'mercenary' && n.isAlive && n.age >= 15 && n.injuredUntil <= state.worldTime)
  if (!npc || !npcCanWork(state, npcId) || state.party.some(p => p.npcId === npcId)) return '這名傭兵目前無法受雇。'
  const { hireCost, eligible } = hireTerms(state)
  if (!eligible) return '傭兵目前不願接受你的委託；先修復與橡谷的信任。'
  const c = player(state)
  if (c.gold < hireCost) return '金幣不足。'
  c.gold -= hireCost
  state.party.push({ npcId, hireCost, dailyWage: 4, contractEnd: (Math.floor(state.worldTime / CONFIG.minutesPerDay) + CONFIG.contractDays) * CONFIG.minutesPerDay, archetype: state.party.length === 1 ? 'healer' : 'fighter' })
  rememberNpc(state, npcId, { kind: 'PLAYER_HIRED_ME', actorId: c.id, at: state.worldTime, detail: `${c.name}聘請我同行。` })
  simulate(state, 10); emit(state, 'party.hired', 'player', `${npc.name} 加入同行，日薪 4 金幣，契約 ${CONFIG.contractDays} 日。`)
  return ''
}
export function enterDungeon(state: GameState) {
  if (!player(state).isAlive || state.combat || state.dungeon.inDungeon || !state.dungeon.discovered || distance(player(state).position, DUNGEON.position) > 1) return '請先探索山谷，前往廢棄礦坑入口。'
  const error = cost(state, 5, 10); if (error) return error
  state.dungeon.inDungeon = true; state.dungeon.stage = 0
  emit(state, 'dungeon.entered', 'player', '進入廢棄礦坑。前方依序是普通怪、精英與守衛首領。')
  return ''
}
export function leaveDungeon(state: GameState) {
  if (state.combat) return '戰鬥中請先逃跑。'
  state.dungeon.inDungeon = false; return ''
}
export function encounter(state: GameState, boss = false) {
  const c = player(state), d = state.dungeon
  if (!c.isAlive || state.combat) return '目前無法開始戰鬥。'
  if (!d.inDungeon && c.currentRegion !== 'forest') return '請前往北方森林或進入礦坑。'
  if (!d.inDungeon && !boss && state.threat.monsterPopulation < 1) return '附近暫時沒有怪物。'
  if (boss && !state.threat.bossAlive) return '目前沒有哥布林酋長。'
  if (c.stamina < 8) return '體力不足，請先休息。'
  c.stamina -= 8
  const eligible = Object.entries(MONSTERS).filter(([, m]) => !m.boss && m.spawnLevel <= state.threat.threatLevel)
  const highest = Math.max(...eligible.map(([, m]) => m.spawnLevel))
  const candidates = eligible.filter(([, m]) => m.spawnLevel === highest)
  const id = (d.inDungeon ? DUNGEON.encounters[d.stage]! : boss ? BOSS.monsterId : candidates[candidates.length === 1 ? 0 : Math.floor(random(state) * candidates.length)]![0]) as keyof typeof MONSTERS
  const m = MONSTERS[id], elite = d.inDungeon && d.stage === 1
  const scale = 1 + ((d.inDungeon ? d.threat : state.threat.threatLevel) - 1) * .25 + (elite ? .4 : 0)
  state.combat = { monsterId: id, hp: Math.round(m.hp * scale), maxHp: Math.round(m.hp * scale), attack: Math.round(m.attack * scale), defense: m.defense, exp: Math.round(m.exp * scale), gold: Math.round(m.gold * scale), elite, dungeon: d.inDungeon }
  c.status = 'combat'; emit(state, 'combat.started', 'player', `遭遇${elite ? '精英' : ''}${m.name}。`)
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}
export function usePotion(state: GameState) {
  const c = player(state)
  if (!c.isAlive || !c.inventory.potion) return '沒有可使用的治療藥水。'
  c.inventory.potion--; c.hp = Math.min(c.maxHp, c.hp + 45)
  return ''
}
export function combatTurn(state: GameState, command: 'attack' | 'defend' | 'potion' | 'run') {
  const c = player(state), monster = state.combat
  if (!c.isAlive || !monster) return '目前沒有戰鬥。'
  if (command === 'run') {
    state.combat = null; c.status = 'idle'; state.dungeon.inDungeon = false; simulate(state, 10)
    emit(state, 'combat.ran', 'player', '你撤離了戰鬥。'); return ''
  }
  if (command === 'potion') { const error = usePotion(state); if (error) return error }
  const family = !monster.dungeon && monster.monsterId === 'wolf' ? monster.familyEncounter : undefined
  const familyPhase = family ? wolfCombatPhase(family, monster.hp, monster.maxHp) : null
  const effectiveDefense = family && familyPhase ? wolfDefenseForTurn(monster.defense, familyPhase) : monster.defense
  const attackContext = familyPhase?.armored ? { wolfArmoredPhase: true } : undefined
  if (command === 'attack') monster.hp = Math.max(0, monster.hp - playerAttackDamage(state, effectiveDefense, monster.monsterId === 'wolf', attackContext))
  for (const p of state.party) {
    const npc = state.npcs.find(n => n.id === p.npcId && n.isAlive)
    if (!npc) continue
    if (p.archetype === 'healer' && c.hp < c.maxHp * .5) c.hp = Math.min(c.maxHp, c.hp + ARCHETYPES.healer.heal + stageIndex(state) * 2)
    else if (c.hp > c.maxHp * .25) monster.hp = Math.max(0, monster.hp - Math.max(1, npc.stats.strength / 2 + stageIndex(state) * 2 - effectiveDefense))
  }
  if (monster.hp <= 0) {
    const wolfFamilyPayout = !monster.dungeon && monster.monsterId === 'wolf'
    const wolfLoot = wolfFamilyPayout
      ? awardWolfLoot(state, { definitionId: family?.definitionId ?? 'grayWolf' })
      : null
    const wolfBoss = !!family && WOLF_MONSTERS[family.definitionId].rank === 'boss'
    const goblinBoss = !family && MONSTERS[monster.monsterId as keyof typeof MONSTERS].boss
    recordHunt(state)
    c.gold += monster.gold
    if (!wolfFamilyPayout) c.inventory[MONSTERS[monster.monsterId as keyof typeof MONSTERS].loot]++
    gainExp(state, c, monster.exp, 'combat'); recordLifeAction(state, 'combat'); state.combat = null; c.status = 'idle'
    if (!monster.dungeon) {
      changeReputation(state, goblinBoss || wolfBoss ? 12 : 1, '守護橡谷北方道路')
      if (!wolfBoss) {
        const detail = family ? `${c.name}擊退森林裡的威脅。` : `${c.name}擊退北方道路的威脅。`
        for (const npc of state.npcs) rememberNpc(state, npc.id, { kind: goblinBoss ? 'GOBLIN_CHIEF_DEFEATED' : 'PLAYER_DEFENDED_OAKVALE', actorId: c.id, at: state.worldTime,
          detail })
      }
      state.threat.monsterPopulation = Math.max(0, state.threat.monsterPopulation - 5)
      state.threat.bossProgress = Math.max(0, state.threat.bossProgress - 10)
      state.threat.threatLevel = threatLevel(state.threat.monsterPopulation)
      state.threat.campLevel = state.threat.threatLevel
      if (goblinBoss) {
        state.threat.bossAlive = false; state.threat.bossProgress = 0; state.threat.warningLevel = 0
        recordRegionalChiefDefeat(state, 'player', c.id)
        state.life.worldMemories.push({ kind: 'GOBLIN_CHIEF_DEFEATED', actorId: c.id, at: state.worldTime, detail: `${c.name}擊敗哥布林酋長。` })
        if (state.life.worldMemories.length > 100) state.life.worldMemories.shift()
        emit(state, 'boss.defeated', 'monster', `${MONSTERS[BOSS.monsterId].name}被擊敗，北方商路暫時恢復平靜。`, true)
      }
      if (wolfBoss) emit(state, 'wolf.boss.defeated', 'monster', `${WOLF_MONSTERS[family.definitionId].name}被擊敗，狼群的威脅暫時減弱。`, true)
    } else {
      state.dungeon.stage++
      if (state.dungeon.stage >= DUNGEON.encounters.length) {
        state.dungeon.inDungeon = false; state.dungeon.runs++; state.dungeon.progress = Math.max(0, state.dungeon.progress - 30)
        state.dungeon.threat = threatLevel(state.dungeon.progress)
        c.inventory.iron += 3 * state.dungeon.threat
        emit(state, 'dungeon.cleared', 'world', '廢棄礦坑探索完成，獲得額外鐵礦。', true)
      }
    }
    const gearMessage = wolfLoot?.instance
      ? ` 另獲得${RARITIES[wolfLoot.instance.rarity].name}${ITEM_BASES[wolfLoot.instance.baseId].name}，可在物品視窗檢視。`
      : ''
    emit(state, 'combat.won', 'player', `戰鬥勝利！獲得 ${monster.exp} 經驗與 ${monster.gold} 金幣。${gearMessage}`)
  } else {
    const companionGuard = state.party.some(p => p.archetype === 'fighter') && c.hp <= c.maxHp * .25 ? ARCHETYPES.fighter.guard : 0
    if (family && familyPhase) {
      const healing = wolfChargeHealing(family, monster.hp, monster.maxHp, familyPhase)
      monster.hp = Math.min(monster.maxHp, monster.hp + healing)
    }
    const incomingAttack = family && familyPhase
      ? wolfAttackForTurn(family, monster.attack, command === 'defend', familyPhase)
      : monster.attack
    c.hp = Math.max(0, c.hp - incomingDamage(state, incomingAttack, command === 'defend', companionGuard))
    if (!c.hp) die(state, c, '戰鬥傷勢')
    if (state.combat?.familyEncounter) advanceWolfTurn(state.combat.familyEncounter)
  }
  simulate(state, 1)
  state.life.director.lastPlayerActivity = state.worldTime
  return ''
}
