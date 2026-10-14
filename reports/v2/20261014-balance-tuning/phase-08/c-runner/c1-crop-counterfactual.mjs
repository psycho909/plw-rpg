import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { computeCounterfactual, parseCsv } from '../../../../../scripts/phase8/c1-crop-counterfactual-core.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const attempt = resolve(here, 'attempt-20261014T090744303Z')
const output = resolve(here, 'c1-crop-counterfactual.json')
const [cropCsv, dailyCsv] = await Promise.all([
  readFile(resolve(attempt, 'crop-yields.csv'), 'utf8'),
  readFile(resolve(attempt, 'daily.csv'), 'utf8'),
])
const result = computeCounterfactual({
  cropRows: parseCsv(cropCsv),
  dailyRows: parseCsv(dailyCsv),
  sourceAttempt: 'attempt-20261014T090744303Z',
})
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`Wrote ${output}`)
console.log('| Variant | Mean sale G / seed | Δ vs current | % current |')
console.log('|---|---:|---:|---:|')
for (const variant of result.variants) {
  console.log(`| ${variant.label} | ${Math.round(variant.meanGoldPerSeed).toLocaleString('en-US')} | ${Math.round(variant.deltaVsCurrentPerSeed).toLocaleString('en-US')} | ${variant.percentOfCurrent.toFixed(1)}% |`)
}
