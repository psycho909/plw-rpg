import test from 'node:test'
import assert from 'node:assert/strict'
import { computeCounterfactual, parseCsv } from './c1-crop-counterfactual-core.mjs'

test('CSV parser keeps quoted commas and escaped quotes', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x,y","say ""hi"""'), [{ a: 'x,y', b: 'say "hi"' }])
})

test('counterfactual variants preserve sequence and derive year-one freeze from day 359', () => {
  const cropRows = parseCsv([
    'route,variant,seed,cropId,plantedSeason,maturityDays,yield,unitSell,foodValueEach,fieldStamina,farmingLevel,event',
    'life,seasonal-farm-sell,7,spring_pea,春,0.5,8,2,1,14,5,',
    'life,seasonal-farm-sell,7,spring_pea,春,0.5,10,2,1,14,7,',
    'life,seasonal-farm-sell,7,spring_pea,春,,,,,,,,plant',
  ].join('\n'))
  const dailyRows = parseCsv('variant,seed,day,farming\nseasonal-farm-sell,7,359,3')
  const result = computeCounterfactual({ cropRows, dailyRows })
  assert.equal(result.evidence.harvestRows, 2)
  assert.deepEqual(result.variants.map(({ meanGoldPerSeed }) => meanGoldPerSeed), [36, 26, 16, 24, 24])
  assert.equal(result.variants[3].seeds[0].year1FarmingLevel, 3)
  assert.equal(result.variants[1].seeds[0].byCrop.spring_pea.yield, 13)
  assert.equal(result.variants[4].seeds[0].byCrop.spring_pea.yield, 12)
})
