export function craftSuccessMessage(itemName: string, masterpiece: boolean, smithingXp: number) {
  const result = `${masterpiece ? '鍛造傑作完成' : '製作完成'}：${itemName}。`
  return smithingXp > 0 ? `${result} 鍛造熟練 +${smithingXp}。` : result
}
