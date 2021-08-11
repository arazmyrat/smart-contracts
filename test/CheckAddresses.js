const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')

describe('CheckAddresses Library', async () => {
  let CheckAddresses,
      RandomID,
      external,
      contract,
      library

  beforeEach(async () => {
    CheckAddresses = await ethers.getContractFactory('CheckAddresses');
    RandomID = await ethers.getContractFactory('RandomID');
    [ external ] = await ethers.getSigners()

    // Deploy the smart contract
    contract = await RandomID.deploy()

    // Deploy the library
    library = await CheckAddresses.deploy()
  })

  describe('Supports Interfaces', () => {
    it('Should report an external address as external', async () => {
      expect(await library.isExternal(external.address)).to.be.true
    })

    it('Should report an external address as not a contract', async () => {
      expect(await library.isContract(external.address)).to.be.false
    })

    it('Should report a smart contract address as a contract', async () => {
      expect(await library.isContract(contract.address)).to.be.true
    })

    it('Should report a smart contract address as not external', async () => {
      expect(await library.isExternal(contract.address)).to.be.false
    })
  })
})
