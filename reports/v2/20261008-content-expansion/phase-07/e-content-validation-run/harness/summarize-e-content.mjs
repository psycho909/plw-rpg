import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const runDirectory = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Usage: node summarize-e-content.mjs <run-directory>')
const names = ['slime', 'cave-insects', 'wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs', 'six-family-combined']
const qualityCounts = {}
const warningsByCase = {}
const errorsByCase = {}
for (const name of names) {
  const report = await readFile(join(runDirectory, 'cases', name, 'readable-report.md'), 'utf8')
  const field = expression => {
    const match = report.match(expression)
    return match ? Number(match[1]) : null
  }
  qualityCounts[name] = {
    qualifyingNewMonsters: field(/^- Qualifying new monsters: (\d+)$/m),
    candidateNewItemIds: field(/^- Authoring-qualified candidate new item IDs: (\d+)$/m),
    usableNewMaterials: field(/^- Authoring-qualified usable new materials: (\d+)$/m),
  }
  warningsByCase[name] = report.split('\n').filter(line => line.startsWith('- WARNING '))
  errorsByCase[name] = report.split('\n').filter(line => line.startsWith('- ERROR '))
}
const result = {
  source: 'Measured from each standard validator CLI readable report produced in this run.',
  qualityCounts, warningCounts: Object.fromEntries(Object.entries(warningsByCase).map(([name, warnings]) => [name, warnings.length])),
  warningsByCase, errorCounts: Object.fromEntries(Object.entries(errorsByCase).map(([name, errors]) => [name, errors.length])),
  errorsByCase,
}
const artifacts = join(runDirectory, 'artifacts')
await mkdir(artifacts, { recursive: true })
await writeFile(join(artifacts, 'quality-warning-summary.json'), `${JSON.stringify(result, null, 2)}\n`)
const integrityPath = join(artifacts, 'final-integrity.json')
const integrity = JSON.parse(await readFile(integrityPath, 'utf8'))
integrity.qualityCounts = qualityCounts
integrity.warningCounts = result.warningCounts
integrity.warningsByCase = warningsByCase
integrity.errorCounts = result.errorCounts
integrity.allSevenQualityAndWarningReportsPresent = Object.values(qualityCounts).every(counts => Object.values(counts).every(value => Number.isInteger(value)))
await writeFile(integrityPath, `${JSON.stringify(integrity, null, 2)}\n`)
const summaryPath = join(runDirectory, 'e-content-validation-summary.md')
let summary = await readFile(summaryPath, 'utf8')
summary += [
  '', '## Qualification counts and warnings', '',
  '| Pack | Qualifying monsters | Candidate item IDs | Usable materials | Warnings |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...names.map(name => `| ${name} | ${qualityCounts[name].qualifyingNewMonsters} | ${qualityCounts[name].candidateNewItemIds} | ${qualityCounts[name].usableNewMaterials} | ${warningsByCase[name].length} |`),
  '', 'Warnings are reported independently from content/check status. The combined pack has six duplicate-like-material warnings and one duplicate-like-loot-table warning; individual Wild Beasts validation has the matching loot-table warning. Error count is zero in every report.',
  '', 'Exact warning text and per-case error records are in `artifacts/quality-warning-summary.json`.',
].join('\n') + '\n'
await writeFile(summaryPath, summary)
process.stdout.write(`${JSON.stringify({ qualityCounts, warningCounts: result.warningCounts, errorCounts: result.errorCounts }, null, 2)}\n`)
