import { createServer } from 'vite'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../../../')
const server = await createServer({ configFile: resolve(root, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' })
try {
  const { createGame } = await server.ssrLoadModule('/src/engine/simulation.ts')
  const { tryStartRegionalCrisis } = await server.ssrLoadModule('/src/engine/regionalCrisis.ts')
  const { serialize, deserialize } = await server.ssrLoadModule('/src/services/saveService.ts')
  const state = createGame(20261008)
  state.threat.monsterPopulation = 30
  state.threat.threatLevel = 2
  state.threat.campLevel = 2
  state.settlement.safety = 60
  const started = tryStartRegionalCrisis(state, () => 0)
  if (!started || state.regionalCrisis.phase !== 'warning' || state.regionalCrisis.severity !== 2) {
    throw new Error(`Controlled legal warning fixture failed: ${JSON.stringify({ started, crisis: state.regionalCrisis })}`)
  }
  const original = JSON.parse(serialize(state, 123456789))
  const severityCases = [
    { label: 'number_2_control', severity: 2, expected: 'accept' },
    { label: 'string_2', severity: '2', expected: 'reject' },
    { label: 'boolean_true', severity: true, expected: 'reject' },
    { label: 'array_2', severity: [2], expected: 'reject' },
  ]
  const cases = severityCases.map(testCase => {
    const value = structuredClone(original)
    value.regionalCrisis.severity = testCase.severity
    const rawJson = JSON.stringify(value)
    try {
      const restored = deserialize(rawJson).state
      return { ...testCase, rawJson, actual: 'accepted', outputSeverity: restored.regionalCrisis.severity,
        outputSeverityType: typeof restored.regionalCrisis.severity }
    } catch (error) {
      return { ...testCase, rawJson, actual: 'rejected', error: String(error?.message ?? error) }
    }
  })
  process.stdout.write(JSON.stringify({
    fixture: { seed: 20261008, started, phase: state.regionalCrisis.phase, severity: state.regionalCrisis.severity,
      monsterPopulation: state.threat.monsterPopulation, threatLevel: state.threat.threatLevel,
      campLevel: state.threat.campLevel, safety: state.settlement.safety,
      worldTime: state.worldTime, rngState: state.rngState },
    cases,
  }))
} finally {
  await server.close()
}
