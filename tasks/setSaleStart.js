const { nowInSeconds } = require('../helpers/time')

const DEFAULT_CONTRACT = process.env.PUNKSCAPE_CONTRACT_ADDRESS
const abi = require('./../artifacts/contracts/PunkScape.sol/PunkScape.json').abi

task('setSaleStart', `Sets the start of the sale`)
  .addOptionalParam('address', `The contract address`)
  .addOptionalParam('time', `The timestamp in seconds since Unix Epoch`)
  .setAction(async ({
    time = nowInSeconds() + 45,
    address = DEFAULT_CONTRACT,
  }) => {
    const [ owner ] = await ethers.getSigners()

    const provider = new ethers.providers.JsonRpcProvider()
    const punkscape = new ethers.Contract(address, abi, provider)

    // Set start time to past
    console.log('Setting start time to ', time)
    await punkscape.connect(owner).setSaleStart(time)
  })
