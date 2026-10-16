import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

// Platform admin defaults to the deployer. Override: --parameters '{"Passmark":{"admin":"0x..."}}'
export default buildModule('Passmark', (m) => {
  const passmark = m.contract('Passmark', [m.getParameter('admin', m.getAccount(0))])
  return { passmark }
})
