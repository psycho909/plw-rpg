import { createServer } from 'vite'

const recipeIds = [
  'frontier_goblin_scrap_spear_recipe',
  'frontier_goblin_plate_vest_recipe',
  'frontier_goblin_wire_knife_recipe',
  'frontier_goblin_signal_coat_recipe',
]
const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const { CONTENT_EQUIPMENT, CONTENT_MATERIALS, CONTENT_RECIPES } = await vite.ssrLoadModule('/src/data/contentRegistry.ts')
  const rows = recipeIds.map(recipeId => {
    const recipe = CONTENT_RECIPES[recipeId]
    if (!recipe) throw new Error(`Missing recipe ${recipeId}`)
    const output = CONTENT_EQUIPMENT[recipe.outputBase]
    if (!output) throw new Error(`Missing output ${recipe.outputBase}`)
    return {
      recipeId,
      outputBase: output.id,
      outputAffixes: [...output.affixIds],
      biasMaterials: recipe.allowedBiasMaterials.map(materialId => {
        const material = CONTENT_MATERIALS[materialId]
        if (!material) throw new Error(`Missing material ${materialId}`)
        const sharedAffixes = Object.keys(material.bias).filter(affixId =>
          material.bias[affixId] > 0 && output.affixIds.includes(affixId))
        return { materialId, bias: material.bias, description: material.description['zh-TW'], sharedAffixes }
      }),
    }
  })
  const failures = rows.flatMap(row => row.biasMaterials
    .filter(material => material.sharedAffixes.length === 0)
    .map(material => `${row.recipeId}/${material.materialId} has no shared affix`))
  process.stdout.write(`${JSON.stringify({ rows, failures }, null, 2)}\n`)
  if (failures.length) process.exitCode = 1
} finally {
  await vite.close()
}
