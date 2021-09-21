task('deployPunkScape', `Deploys the PunkScape.sol Contract`)
  .setAction(async () => {
    const [deployer] = await ethers.getSigners()
    const networkConfig = hre.config.networks[hre.network.name]

    console.log('Deploying contracts with the account:', deployer.address)
    console.log('Account Balance:', (await deployer.getBalance()).toString())
    console.log('MetaData CID:', process.env.SCAPES_METADATA_CID)
    console.log('Sale Start:', process.env.START_SALE)
    console.log('Contract Metadata URL:', process.env.SCAPES_CONTRACT_METADATA_URL)
    console.log('CryptoPunk Contract Address:', networkConfig.CryptoPunksAddress)
    console.log('OneDayPunk Contract Address:', networkConfig.OneDayPunksAddress)

    const PunkScape = await ethers.getContractFactory('PunkScape')

    const contract = await PunkScape.deploy(
      deployer.address,
      process.env.SCAPES_METADATA_CID,
      process.env.START_SALE,
      process.env.SCAPES_CONTRACT_METADATA_URL,
      networkConfig.CryptoPunksAddress,
      networkConfig.OneDayPunksAddress,
    )

    console.log('PunkScape Contract Address:', contract.address)
  })
