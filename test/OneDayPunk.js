const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers, waffle } = require('hardhat')

describe('OneDayPunk Contract', async () => {
  const CID = 'IPFS_CID_HASH'
  const LARVA_LABS = '0xc352b534e8b987e036a93539fd6897f53488e56a'

  let CheckAddress,
      library,
      OneDayPunk,
      contract,
      owner,
      buyer1,
      buyer2,
      addrs,
      larvalabs

  before(async () => {
    CheckAddress = await ethers.getContractFactory('CheckAddress');
    library = await CheckAddress.deploy()

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [LARVA_LABS],
    })

    larvaLabs = await ethers.getSigner(LARVA_LABS)
  })

  beforeEach(async () => {
    OneDayPunk = await ethers.getContractFactory('OneDayPunk', {
      libraries: {
        CheckAddress: library.address,
      },
    });
    [ owner, jalil, buyer1, buyer2, ...addrs ] = await ethers.getSigners()


    // Deploy the smart contract
    contract = await OneDayPunk.deploy(CID, 'https://punkPunk.xyz/onedaypunk-meta')
  })

  describe('Deployment', () => {
    it('Should set the total supply of 10000 tokens', async () => {
      expect(await contract.totalSupply()).to.equal(10000)
    })

    it('Should set the right contract meta data URL', async () => {
      expect(await contract.contractURI()).to.equal('https://punkPunk.xyz/onedaypunk-meta')
    })
  })

  describe('Supports Interfaces', () => {
    it('Should support the IERC721 interface', async () => {
      expect(await contract.supportsInterface(0x80ac58cd)).to.be.true
    })

    it('Should support the IERC721Metadata interface', async () => {
      expect(await contract.supportsInterface(0x5b5e139f)).to.be.true
    })
  })

  describe('Public Sale', () => {
    describe('Mint', () => {
      it('Wallets should be able to claim a Punk', async () => {
        const transaction = await contract.connect(buyer1).claim()
        const receipt = await transaction.wait()
        tokenId = receipt.events?.find(e => e.event === 'Transfer').args.tokenId

        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)

        await expect(contract.connect(buyer2).claim())
                    .to.emit(contract, 'Transfer')
      })

      it('Doesn\'t allow CryptoPunk holders to get a Punk', async () => {
        await expect(contract.connect(larvaLabs).claim())
          .to.be.revertedWith('You lucky one already have a CryptoPunk.')
      })

      it('Updates the sold count', async () => {
        expect(await contract.tokenCount()).to.equal(0)

        await contract.connect(buyer1).claim()
        expect(await contract.tokenCount()).to.equal(1)

        await contract.connect(buyer2).claim()
        expect(await contract.tokenCount()).to.equal(2)
      })

      it('Wallets should be can only mint one token', async () => {
        await contract.connect(buyer1).claim()
        await expect(contract.connect(buyer1).claim())
                    .to.be.revertedWith('Can only hold one token per wallet')
      })

      it.only('Sells 10000, then fails on further tries', async () => {
        let sold = 0
        const wallets = await Promise.all(Array.from({ length: 10000 }).map((_) => {
          wallet = waffle.provider.createEmptyWallet()
          return owner.sendTransaction({ to: wallet.address, value: BigNumber.from('1882703627751798096') })
        }))

        console.log(`         Started selling`)
        while (sold < 10000) {
          await contract.connect(wallets[sold]).claim()
          sold ++
          console.log(sold)
          if (sold % 50 === 0) {
            console.log(`          === ${sold} SOLD ===`)
            expect(await contract.tokenCount()).to.equal(sold)
          }
        }

        expect(await contract.tokenCount()).to.equal(10000)

        await expect(contract.connect(buyer1).claim())
                    .to.be.revertedWith('No more Punks available')
      })
    })
  })


  describe('Token Holder', () => {
    let tokenId

    beforeEach(async () => {
      const transaction = await contract.connect(buyer1).claim()
      const receipt = await transaction.wait()

      tokenId = receipt.events?.find(
        e => e.event === 'Transfer'
      ).args.tokenId
    })

    describe('Show Punk', () => {
      it('Should show the Punk of a holder', async () => {
        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)
      })

      it('Should not show a Punk for non-holders', async () => {
        const otherTokenId = tokenId === 9999 ? tokenId - 1 : tokenId + 1

        await expect(contract.ownerOf(otherTokenId)).to.be.revertedWith('ERC721: owner query for nonexistent token')
        expect(await contract.balanceOf(buyer2.address)).to.equal(0)
      })
    })

    describe('Transfer Punk', () => {
      it('Should be able to transfer a Punk to another wallet', async () => {
        await contract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId)

        expect(await contract.ownerOf(tokenId)).to.equal(buyer2.address)
      })

      it('Should not be able to transfer a Punk to a wallet that already has one', async () => {
        await (await contract.connect(buyer2).claim()).wait()

        await expect(contract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, tokenId))
          .to.be.revertedWith('Can only hold one token per wallet')

        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)
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
})
