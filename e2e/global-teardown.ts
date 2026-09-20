import { cleanAllTestData } from '../scripts/clean-test-data.mjs'

async function globalTeardown() {
  console.log('\n[Playwright Global Teardown] Limpiando registros de prueba...')
  await cleanAllTestData()
}

export default globalTeardown
