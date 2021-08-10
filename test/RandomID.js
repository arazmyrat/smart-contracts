const { ethers } = require('hardhat')

describe('Random ID Contract', () => {
  let RandomID,
      contract

  beforeEach(async () => {
    RandomID = await ethers.getContractFactory('RandomID');

    // Deploy the smart contract
    contract = await RandomID.deploy()
  })

  it('Gets random unique IDs', async () => {
    const ids = []
    const count = parseInt((await contract.MAX_COUNT()).toString())
    let transaction;
    let receipt;
    let value;

    for (let index = 0; index < count; index++) {
      transaction = await contract.randomIndex()
      receipt = await transaction.wait()
      value = parseInt(receipt.events?.find(e => e.event === 'NewID').args.id)
      ids.push(value)
      console.log('new ID', value)
    }

    console.log('IDs', ids)
  })
})
