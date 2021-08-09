async function main () {
  const [deployer] = await ethers.getSigners()

  console.log('Deploying contracts with the account:', deployer.address)
  console.log('Account balance:', (await deployer.getBalance()).toString())
  console.log('Sale start:', process.env.START_TIME)
  console.log('Beneficiary Wallet:', process.env.BENEFICIARY_WALLET)
  console.log('MetaData CID:', process.env.METADATA_CID)

  const PunkScape = await ethers.getContractFactory('PunkScape')
  const contract = await PunkScape.deploy(
    process.env.BENEFICIARY_WALLET,
    process.env.METADATA_CID,
    process.env.START_TIME,
    process.env.CONTRACT_METADATA_URL,
  )

  console.log('PunkScape contract address:', contract.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
