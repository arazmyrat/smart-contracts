const { nowInSeconds } = require('../helpers/time')
require('hardhat/config')

const DEFAULT_CONTRACT = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const abi = require('./../artifacts/contracts/SudoNim.sol/SudoNim.json').abi

task('setSaleStart', `Sets the start of the sale`)
  .addOptionalParam('address', `The contract address`)
  .addOptionalParam('time', `The timestamp in seconds since Unix Epoch`)
  .setAction(async ({
    time = nowInSeconds() + 45,
    address = DEFAULT_CONTRACT,
  }) => {
    const [ owner ] = await ethers.getSigners()

    const provider = new ethers.providers.JsonRpcProvider()
    const sudonims = new ethers.Contract(address, abi, provider)

    // Set start time to past
    console.log('Setting start time to ', time)
    await sudonims.connect(owner).setSaleStart(time)
  })
