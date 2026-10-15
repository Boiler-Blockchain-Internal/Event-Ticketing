import hardhatToolboxViem from '@nomicfoundation/hardhat-toolbox-viem'
import { configVariable, defineConfig } from 'hardhat/config'

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: { version: '0.8.28' },
  networks: {
    // Base is the likely L2 per the planning doc. Set secrets with `npx hardhat keystore set <NAME>`.
    baseSepolia: {
      type: 'http',
      chainType: 'op',
      url: configVariable('BASE_SEPOLIA_RPC_URL'),
      accounts: [configVariable('DEPLOYER_PRIVATE_KEY')],
    },
  },
})
