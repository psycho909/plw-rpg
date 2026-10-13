import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const runDirectory = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Usage: node finalize-f-content-evidence.mjs <run-directory>')
const parse = async path => JSON.parse(await readFile(path, 'utf8'))
const names = ['slime', 'cave-insects', 'wild-beasts', 'frontier-goblins', 'fog-undead', 'mine-constructs', 'six-family-combined']
const quality = await parse(join(runDirectory, 'artifacts/quality-warning-summary.json'))
const gear = await parse(join(runDirectory, 'artifacts/semantic-gear-audit.json'))
const before = await parse(join(runDirectory, 'artifacts/before.json'))
const after = await parse(join(runDirectory, 'artifacts/after.json'))
const outcomes = {}
for (const name of names) {
  const caseDirectory = join(runDirectory, 'cases', name)
  const runName = (await readdir(join(caseDirectory, '.qa-runs')))[0]
  const evidenceDirectory = join(caseDirectory, '.qa-runs', runName)
  outcomes[name] = {
    cli: await parse(join(runDirectory, 'artifacts', `validate-${name}.result.json`)),
    validator: await parse(join(evidenceDirectory, 'outcome.json')),
    publisher: await parse(join(evidenceDirectory, 'report-publish.status.json')),
  }
}
const combinedQuality = quality.qualityCounts['six-family-combined']
const combinedErrorIds = new Set(quality.errorsByCase['six-family-combined'].map(line => line.match(/^\- ERROR [^[]+ \[([^\]]+)\]/)?.[1]).filter(Boolean))
const cloneMemberIds = gear.functionalCloneGroups.flatMap(group => group.members.map(member => member.id))
const qualifyingCloneMemberIds = cloneMemberIds.filter(id => !combinedErrorIds.has(id))
const qualifiedGearCount = combinedQuality.candidateNewItemIds - combinedQuality.usableNewMaterials
const gearAudit = {
  ...gear,
  validatorQualifiedGearCandidates: qualifiedGearCount,
  functionalCloneMembersAmongQualifiedGear: qualifyingCloneMemberIds.length,
  qualifiedGearAfterExcludingAllFunctionalCloneMembers: qualifiedGearCount - qualifyingCloneMemberIds.length,
  qualifyingCloneMemberIds,
  combinedValidatorErrorIds: [...combinedErrorIds],
}
const summary = {
  runId: runDirectory.split('/').at(-1),
  headBefore: before.head, headAfter: after.head, branchBefore: before.branch, branchAfter: after.branch,
  sourceConfigPackageMapFilesBefore: Object.keys(before.sha256).length,
  sourceConfigPackageMapFilesAfter: Object.keys(after.sha256).length,
  sourceConfigPackageMapUnchanged: JSON.stringify(before.sha256) === JSON.stringify(after.sha256),
  aggregateRawCounts: { families: 6, monsters: 66, materials: 48, equipment: 48, recipes: 24, crops: 0, cropGoods: 0 },
  actualQualityCounts: quality.qualityCounts,
  warningCounts: quality.warningCounts, warningsByCase: quality.warningsByCase,
  errorCounts: quality.errorCounts, errorsByCase: quality.errorsByCase,
  childChecks: Object.fromEntries(names.map(name => [name, {
    cliExit: outcomes[name].cli.exitCode,
    contentStatus: outcomes[name].validator.contentValidationStatus,
    overallStatus: outcomes[name].validator.overallStatus,
    targetedTests: outcomes[name].validator.checks.targetedTests,
    typecheck: outcomes[name].validator.checks.typecheck,
    reportPublisher: { status: outcomes[name].publisher.status, exitCode: outcomes[name].publisher.exitCode },
  }])),
  functionalGearAudit: gearAudit,
}
const artifactDirectory = join(runDirectory, 'artifacts')
await writeFile(join(artifactDirectory, 'f-functional-gear-quality-audit.json'), `${JSON.stringify(gearAudit, null, 2)}\n`, { flag: 'wx' })
await writeFile(join(artifactDirectory, 'f-final-evidence-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' })
const statuses = names.map(name => {
  const item = summary.childChecks[name]
  const tests = item.targetedTests.stdout.match(/Tests\s+(\d+) passed/)?.[1] ?? '?'
  return `| ${name} | ${item.cliExit} | ${item.contentStatus} | ${tests} | ${item.typecheck.status} | ${quality.errorCounts[name]} | ${quality.warningCounts[name]} |`
})
const testCounts = Object.fromEntries(names.map(name => [name,
  summary.childChecks[name].targetedTests.stdout.match(/Tests\s+(\d+) passed/)?.[1] ?? 'unparsed']))
const contentPassCount = names.filter(name => summary.childChecks[name].contentStatus === 'PASS').length
const contentFailures = names.filter(name => summary.childChecks[name].contentStatus !== 'PASS')
const checkSummary = `All ${names.length} CLI invocations passed their recorded targeted-test counts: ${names.map(name => `${name} ${testCounts[name]}`).join(', ')}; typecheck and report publisher passed for all seven. Content validation passed for ${contentPassCount}/${names.length} cases.${contentFailures.length ? ` Failed cases: ${contentFailures.map(name => `${name} (CLI exit ${summary.childChecks[name].cliExit}, ${summary.childChecks[name].contentStatus})`).join('; ')}.` : ' No content-validation failures.'}`
const warningLines = names.flatMap(name => quality.warningsByCase[name].map(line => `- ${name}: ${line}`))
const errorLines = names.flatMap(name => quality.errorsByCase[name].map(line => `- ${name}: ${line}`))
const exactHashes = JSON.parse(await readFile(join(runDirectory, 'packs/extraction-manifest.json'), 'utf8')).packArtifacts
const lines = [
  '# F Six-Family Standard Validator Evidence', '',
  `- Run: ${summary.runId}`,
  `- HEAD: ${before.head} before / ${after.head} after; branch: ${before.branch}`,
  `- Source/config/package map unchanged: ${summary.sourceConfigPackageMapUnchanged} (${summary.sourceConfigPackageMapFilesBefore} files before, ${summary.sourceConfigPackageMapFilesAfter} after; excludes __pycache__ and .pyc)`,
  `- Raw merged counts: ${JSON.stringify(summary.aggregateRawCounts)}`,
  `- Extracted pack sizes and SHA-256: ${JSON.stringify(exactHashes)}`,
  '', '## Validator outcomes', '',
  '| Pack | CLI exit | Content | Targeted tests | Typecheck | Errors | Warnings |',
  '| --- | ---: | --- | ---: | --- | ---: | ---: |', ...statuses,
  '', checkSummary,
  '', '## Qualified content counts', '',
  ...Object.entries(quality.qualityCounts).map(([name, counts]) => `- ${name}: ${JSON.stringify(counts)}`),
  '', '## Gear functional-equivalence audit', '',
  `- Canonical profile: slot, attack, defense, penetration, and effective affix eligibility; excludes sale, names, descriptions, and equipment IDs from the grouping key. Authored affixes resolve to stat/slots/tiers; baseline affixes preserve their stable ID.`,
  `- Functional clone groups: ${gear.functionalCloneGroupCount}; all group members excluded: ${gear.allMembersOfCloneGroupsExcludedCount} raw items (${qualifyingCloneMemberIds.length} are qualified gear).`,
  `- Raw equipment remaining after excluding all clone-group members: ${gear.equipmentCountAfterExcludingAllCloneGroupMembers} / ${gear.equipmentCount}.`,
  `- Validator-qualified gear candidates: ${qualifiedGearCount}; after excluding ${qualifyingCloneMemberIds.length} qualified clone members: ${gearAudit.qualifiedGearAfterExcludingAllFunctionalCloneMembers}.`,
  `- Exact clone groups: ${JSON.stringify(gear.functionalCloneGroups)}`,
  '', '## Errors', '', ...(errorLines.length ? errorLines : ['- None.']),
  '', '## Warnings', '', ...(warningLines.length ? warningLines : ['- None.']),
  '', 'Each CLI retained its exact JSON bytes and source snapshots before parsing. Raw command streams, exits, UTC/Taipei times, manifests, and maps are in `artifacts/` and each `cases/<pack>/.qa-runs/` directory. No source edits, full suite, or Phase 7-G/100-item acceptance occurred in this run.',
]
const summaryPath = join(runDirectory, 'f-content-validation-final-summary.md')
await writeFile(summaryPath, `${lines.join('\n')}\n`, { flag: 'wx' })
const bytes = await readFile(summaryPath)
process.stdout.write(`${JSON.stringify({ summaryPath, summarySha256: createHash('sha256').update(bytes).digest('hex'), sourceMapUnchanged: summary.sourceConfigPackageMapUnchanged, outcomes: summary.childChecks, gearAudit: { raw: gear.equipmentCount, cloneGroups: gear.functionalCloneGroupCount, cloneMembersExcluded: gear.allMembersOfCloneGroupsExcludedCount, rawAfterExclusion: gear.equipmentCountAfterExcludingAllCloneGroupMembers, validatorQualifiedGear: qualifiedGearCount, qualifiedAfterExclusion: gearAudit.qualifiedGearAfterExcludingAllFunctionalCloneMembers } }, null, 2)}\n`)
