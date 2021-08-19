const hre = require('hardhat')

async function main () {
  const [deployer] = await ethers.getSigners()
  const networkConfig = hre.config.networks[hre.network.name]

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())
  console.log('MetaData CID:', process.env.METADATA_CID)
  console.log('Contract Metadata URL:', process.env.CONTRACT_METADATA_URL)

  const OneDayPunk = await ethers.getContractFactory('OneDayPunk', {
    libraries: networkConfig.libraries,
  })
  const contract = await OneDayPunk.deploy(
    process.env.METADATA_CID,
    process.env.CONTRACT_METADATA_URL,
  )

  console.log('OneDayPunk contract address:', contract.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
