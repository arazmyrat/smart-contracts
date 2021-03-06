task('deployOneDayPunk', `Deploys the OneDayPunk.sol Contract`)
  .setAction(async () => {
    const [deployer] = await ethers.getSigners()
    const networkConfig = hre.config.networks[hre.network.name]

    console.log('Deploying contracts with the account:', deployer.address)
    console.log('Account Balance:', (await deployer.getBalance()).toString())
    console.log('MetaData CID:', process.env.ONEDAY_METADATA_CID)
    console.log('Contract Metadata URL:', process.env.ONEDAY_CONTRACT_METADATA_URL)
    console.log('CryptoPunk Contract Address:', networkConfig.CryptoPunksAddress)

    const OneDayPunk = await ethers.getContractFactory('OneDayPunk', {
      libraries: networkConfig.libraries,
    })
    const contract = await OneDayPunk.deploy(
      process.env.ONEDAY_METADATA_CID,
      process.env.ONEDAY_CONTRACT_METADATA_URL,
      networkConfig.CryptoPunksAddress
    )

    console.log('OneDayPunk Contract Address:', contract.address)
  })
