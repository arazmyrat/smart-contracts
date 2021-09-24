require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-waffle')
require('hardhat-gas-reporter')
require('dotenv').config()

// Import tasks
require('./tasks/deployOneDayPunk')
require('./tasks/deployPunkScape')
require('./tasks/setSaleStart')

const CHECK_ADDRESS = `0x32336A625aacFA08fe9723d901FFf92A7E3465c1`
const CRYPTOPUNKS_ADDRESS = `0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB`
const ONEDAYPUNKS_ADDRESS = `0x5537d90a4a2dc9d9b37bab49b490cf67d4c54e91`
const AFTER_ODP_BLOCK = 13234989
const HARDHAT_NETWORK_CONFIG = {
  chainId: 1337,
  libraries: {
    CheckAddress: CHECK_ADDRESS,
  },
  CryptoPunksAddress: CRYPTOPUNKS_ADDRESS,
  OneDayPunksAddress: ONEDAYPUNKS_ADDRESS,
  forking: {
    url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
    blockNumber: AFTER_ODP_BLOCK,
  },
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`0x${process.env.OWNER_PRIVATE_KEY}`],
      libraries: {
        CheckAddress: CHECK_ADDRESS,
      },
      CryptoPunksAddress: CRYPTOPUNKS_ADDRESS,
      OneDayPunksAddress: ONEDAYPUNKS_ADDRESS,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`0x${process.env.OWNER_PRIVATE_KEY}`],
      libraries: {
        CheckAddress: `0x029374cA831F9F4B04a0D896B8d00CcE05f30D8f`,
      },
      CryptoPunksAddress: '0x52c5170414e72f2364869387bd9684245118deed',
      OneDayPunksAddress: '0x3973acaa9a8c1d1d7530128472d18519451d0bbf',
    },
    localhost: HARDHAT_NETWORK_CONFIG,
    hardhat: HARDHAT_NETWORK_CONFIG,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 5_000_000,
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 80,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    excludeContracts: [
      'CheckAddress',
    ],
  },
};
