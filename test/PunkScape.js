const { parseUnits } = require('ethers/lib/utils')
const { AddressZero } = require('ethers/lib/ethers')
const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { nowInUTCSeconds, daysInSeconds } = require('./../helpers/time')

describe('PunkScape Contract', async () => {
  const PRICE = parseUnits('0.02', 'ether')
  const CID = 'IPFS_CID_HASH'
  const START_SALE = (await ethers.provider.getBlock('latest')).timestamp

  let OneDayPunk,
      oneDayPunkContract,
      PunkScape,
      contract,
      owner,
      jalil,
      buyer1,
      buyer2,
      addrs

  beforeEach(async () => {
    OneDayPunk = await ethers.getContractFactory('OneDayPunk');
    PunkScape = await ethers.getContractFactory('PunkScape');
    [ owner, jalil, buyer1, buyer2, ...addrs ] = await ethers.getSigners()

    // Deploy the smart contract
    oneDayPunkContract = await OneDayPunk.deploy(CID, 'https://punkscape.xyz/contract-meta')

    contract = await PunkScape.deploy(
      jalil.address,
      CID,
      START_SALE,
      'https://punkscape.xyz/contract-meta',
      oneDayPunkContract.address
    )
  })

  describe('Deployment', () => {
    it('Should set the right owner', async () => {
      expect(await contract.owner()).to.equal(owner.address)
    })

    it('Should set the total supply of 10000 tokens', async () => {
      expect(await contract.MAX_COUNT()).to.equal(10000)
    })

    it('Should set the right contract meta data URL', async () => {
      expect(await contract.contractURI()).to.equal('https://punkscape.xyz/contract-meta')
    })
  })

  describe('Supports Interfaces', () => {
    it('Should support the IERC721 interface', async () => {
      expect(await contract.supportsInterface(0x80ac58cd)).to.be.true
    })

    it('Should support the IERC721Metadata interface', async () => {
      expect(await contract.supportsInterface(0x5b5e139f)).to.be.true
    })

    it('Should support the HasSecondarySaleFees interface', async () => {
      expect(await contract.supportsInterface(0xb7799584)).to.be.true
    })
  })

  describe('Public Sale', () => {
    describe('SaleStart', () => {
      it('Should expose the saleStart time', async () => {
        expect(await contract.saleStart()).to.equal(START_SALE)
      })

      it('Should not mint if sale hasn\'t started yet', async () => {
        await contract.connect(owner).setSaleStart(nowInUTCSeconds() + daysInSeconds(1))

        await expect(contract.connect(buyer1).mint({ value: PRICE }))
          .to.be.revertedWith('Sale hasn\'t started yet')
      })

      it('Should allow mint if sale has started', async () => {
        await expect(contract.connect(buyer1).mint({ value: PRICE }))
          .to.emit(contract, 'Transfer')
      })

      it('Should emit SaleStartChanged when the sale start changes', async () => {
        const time = nowInUTCSeconds() + daysInSeconds(1)
        await expect(contract.connect(owner).setSaleStart(time))
          .to.emit(contract, 'SaleStartChanged')
          .withArgs(time)
      })
    })

    describe('Mint', () => {
      it.only('Wallets should be able to mint a scape', async () => {
        const transaction = await contract.connect(buyer1).mint({ value: PRICE })
        const receipt = await transaction.wait()
        tokenId = receipt.events?.find(
          e => e.event === 'Transfer' && e.address === contract.address
        ).args.tokenId

        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)

        await expect(contract.connect(buyer2).mint({ value: PRICE }))
                    .to.emit(contract, 'Transfer')
      })

      it('Fails if transaction value is less than 0.02 ETH', async () => {
        await expect(contract.connect(buyer1).mint({ value: PRICE.sub(10) }))
                    .to.be.revertedWith(`Sorry it is 0.02ETH, friend`)

        expect(await contract.balanceOf(buyer1.address)).to.equal(0)
      })

      it('Updates the sold count', async () => {
        expect(await contract.count()).to.equal(0)

        await contract.connect(buyer1).mint({ value: PRICE })
        expect(await contract.count()).to.equal(1)

        await contract.connect(buyer2).mint({ value: PRICE })
        expect(await contract.count()).to.equal(2)
      })

      it.skip('Sells 10000, then fails on further tries', async () => {
        let sold = 0
        let wallet

        console.log(`         Started selling`)
        while (sold < 10000) {
          wallet = waffle.provider.createEmptyWallet()
          await owner.sendTransaction({ to: wallet.address, value: PRICE.mul(2) })
          await contract.connect(wallet).mint({ value: PRICE })
          sold ++
          if (sold % 500 === 0) {
            console.log(`          === ${sold} SOLD ===`)
            expect(await contract.ScapeCount()).to.equal(sold)
          }
        }

        expect(await contract.ScapeCount()).to.equal(10000)

        await expect(contract.connect(buyer1).mint({ value: PRICE }))
                    .to.be.revertedWith('No more Scapes available')
      })
    })
  })


  describe('Token Holder', () => {
    let tokenId

    beforeEach(async () => {
      const transaction = await contract.connect(buyer1).mint({ value: PRICE })
      const receipt = await transaction.wait()

      tokenId = receipt.events?.find(
        e => e.event === 'Transfer' && e.address === contract.address
      ).args.tokenId
    })

    describe('Show Scape', () => {
      it('Should show the Scape of a holder', async () => {
        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)
      })

      it('Should not show a Scape for non-holders', async () => {
        const otherTokenId = tokenId === 9999 ? tokenId - 1 : tokenId + 1

        await expect(contract.ownerOf(otherTokenId)).to.be.revertedWith('ERC721: owner query for nonexistent token')
        expect(await contract.balanceOf(buyer2.address)).to.equal(0)
      })
    })

    describe('Transfer Scape', () => {
      it('Should be able to transfer a Scape to another wallet', async () => {
        await contract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId)

        expect(await contract.ownerOf(tokenId)).to.equal(buyer2.address)
      })
    })
  })

  describe('Update Contract Meta Data', () => {
    it('Owner can update the contract meta data URI', async () => {
      await contract.setContractURI('foobar')

      expect(await contract.contractURI()).to.equal('foobar')
    })

    it('Non-Owners can not update the contract meta data URI', async () => {
      await expect(contract.connect(buyer1).setContractURI('foobar'))
        .to.be.revertedWith('caller is not the owner')
    })
  })

  describe('HasSecondarySalesFees', () => {
    it('Reports fee recipients for a token', async () => {
      const recipients = await contract.getFeeRecipients(80)
      expect(JSON.stringify(recipients)).to.equal(JSON.stringify([jalil.address]))
    })
    it('Reports fee BPS for a token', async () => {
      const bpsArray = await contract.getFeeBps(80)
      expect(JSON.stringify(bpsArray.map(bps => bps.toNumber()))).to.equal(JSON.stringify([250]))
    })
  })
})
