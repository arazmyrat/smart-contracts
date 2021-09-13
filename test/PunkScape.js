const { parseUnits } = require('ethers/lib/utils')
const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { nowInUTCSeconds, daysInSeconds } = require('./../helpers/time')
const { BigNumber } = require('ethers')

const networkConfig = hre.config.networks[hre.network.name]
const PRICE = parseUnits('0.02', 'ether')
const CID = 'IPFS_CID_HASH'
const LARVA_LABS = '0xc352b534e8b987e036a93539fd6897f53488e56a'
let START_SALE

describe('PunkScape Contract', async () => {
  let CheckAddress,
      checkAddressLibrary,
      OneDayPunk,
      oneDayPunkContract,
      PunkScape,
      contract,
      owner,
      jalil,
      buyer1,
      buyer2,
      addrs,
      larvaLabs

  before(async () => {
    START_SALE = (await ethers.provider.getBlock('latest')).timestamp

    CheckAddress = await ethers.getContractFactory('CheckAddress');
    checkAddressLibrary = await CheckAddress.deploy()

    OneDayPunk = await ethers.getContractFactory('OneDayPunk', {
      libraries: {
        CheckAddress: checkAddressLibrary.address,
      },
    })

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [LARVA_LABS],
    })

    larvaLabs = await ethers.getSigner(LARVA_LABS)
  })

  beforeEach(async () => {
    PunkScape = await ethers.getContractFactory('PunkScape');
    [ owner, jalil, buyer1, buyer2, ...addrs ] = await ethers.getSigners()

    // Deploy the smart contract
    oneDayPunkContract = await OneDayPunk.deploy(
      CID,
      'https://punkscape.xyz/contract-meta',
      networkConfig.CryptoPunksAddress
    )

    contract = await PunkScape.deploy(
      jalil.address,
      CID,
      START_SALE,
      'https://punkscape.xyz/contract-meta',
      networkConfig.CryptoPunksAddress,
      oneDayPunkContract.address
    )
  })

  describe('Deployment', () => {
    it('Should set the right owner', async () => {
      expect(await contract.owner()).to.equal(owner.address)
    })

    it('Should set the total supply of 10000 tokens', async () => {
      expect(await contract.totalSupply()).to.equal(10000)
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
      let futureSaleStart

      beforeEach(async () => {
        futureSaleStart = (await ethers.provider.getBlock('latest')).timestamp + 180

        contract = await PunkScape.deploy(
          jalil.address,
          CID,
          futureSaleStart,
          'https://punkscape.xyz/contract-meta',
          networkConfig.CryptoPunksAddress,
          oneDayPunkContract.address
        )
      })

      it('Should expose the saleStart time', async () => {
        expect(await contract.saleStart()).to.equal(futureSaleStart)
      })

      it('Should be able to change sale start before the sale has started', async () => {
        await contract.connect(owner).setSaleStart(nowInUTCSeconds() + daysInSeconds(1))
      })

      it('Should not be able to change sale start after the sale has started', async () => {
        await contract.connect(owner).setSaleStart(START_SALE)
        await expect(contract.connect(owner).setSaleStart(nowInUTCSeconds() - daysInSeconds(1)))
          .to.be.revertedWith('Sale has already started')
      })

      it('Should not mint if sale hasn\'t started yet', async () => {
        await expect(contract.connect(buyer1).mint(1, { value: PRICE }))
          .to.be.revertedWith('Sale hasn\'t started yet')
      })

      it('Should allow mint if sale has started', async () => {
        await contract.connect(owner).setSaleStart(START_SALE)
        await expect(contract.connect(buyer1).mint(1, { value: PRICE }))
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
      it('Wallets (w/o ODPs) should not be able to mint a scape', async () => {
        expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(0)

        await expect(contract.connect(buyer1).mint(1, { value: PRICE }))
          .to.be.revertedWith("You have to own a OneDayPunk to mint during the initial claiming window.")
      })

      it.only('Holders of a OneDayPunk should be able to mint one scape during initial claiming phase', async () => {
        // buyer has a one day punk
        await oneDayPunkContract.connect(buyer1).claim()
        expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(1)

        const transaction = await contract.connect(buyer1).mint(1, { value: PRICE })
        const receipt = await transaction.wait()
        tokenId = receipt.events?.find(
          e => e.event === 'Transfer' && e.address === contract.address
        ).args.tokenId

        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)

        await expect(contract.connect(buyer1).mint(1, { value: PRICE }))
          .to.be.revertedWith("Can only claim one punkscape.")

        // TODO: only one scape during claiming phase
      })

      it('Holders of CryptoPunks should not be able to mint a scape during initial claiming phase', async () => {
        const transaction = await contract.connect(larvaLabs).mint(1, { value: PRICE })
        const receipt = await transaction.wait()
        tokenId = receipt.events?.find(
          e => e.event === 'Transfer' && e.address === contract.address
        ).args.tokenId

        expect(await contract.ownerOf(tokenId)).to.equal(larvaLabs.address)
        expect(await oneDayPunkContract.balanceOf(larvaLabs.address)).to.equal(0)
      })

      it('Should allow to mint multiple PunkScapes in one transaction', async () => {
        const transaction = await contract.connect(buyer1).mint(15, { value: PRICE.mul(15) })
        const receipt = await transaction.wait()
        events = receipt.events?.filter(
          e => e.event === 'Transfer' && e.address === contract.address
        )

        expect(events.length).to.equal(15)
        expect(await contract.balanceOf(buyer1.address)).to.equal(15)
        expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(1)
      })

      it('Fails if transaction value is less than 0.02 ETH per punkscape', async () => {
        await expect(contract.connect(buyer1).mint(1, { value: PRICE.sub(10) }))
                    .to.be.revertedWith(`Pay up, friend - it's 0.02 ETH per PunkScape`)

        await expect(contract.connect(buyer1).mint(20, { value: PRICE.mul(19) }))
                    .to.be.revertedWith(`Pay up, friend - it's 0.02 ETH per PunkScape`)

        expect(await contract.balanceOf(buyer1.address)).to.equal(0)
      })

      it('Fails if amount isn\'t allowed', async () => {
        await expect(contract.connect(buyer1).mint(0, { value: PRICE }))
                    .to.be.revertedWith(`Have to mint at least one punkscape.`)

        await expect(contract.connect(buyer1).mint(51, { value: PRICE.mul(51) }))
                    .to.be.revertedWith(`Can't mint more than 20 punkscapes per transaction.`)

        expect(await contract.balanceOf(buyer1.address)).to.equal(0)

        // Try to mint more than 200
        for (let index = 0; index < 10; index++) {
          await contract.connect(buyer1).mint(20, { value: PRICE.mul(20) })
        }
        expect(await contract.balanceOf(buyer1.address)).to.equal(200)
        await expect(contract.connect(buyer1).mint(1, { value: PRICE }))
                    .to.be.revertedWith(`Feeling the love, but 200 PunkScapes is enough to start with :-)`)
      })

      it('Updates the sold count', async () => {
        expect(await contract.tokenCount()).to.equal(0)

        await contract.connect(buyer1).mint(1, { value: PRICE })
        expect(await contract.tokenCount()).to.equal(1)

        await contract.connect(buyer2).mint(1, { value: PRICE })
        expect(await contract.tokenCount()).to.equal(2)
      })

      it.skip('Sells 10000, then fails on further tries', async () => {
        let sold = 0
        let wallet

        console.log(`         Started selling`)
        while (sold < 10000) {
          wallet = waffle.provider.createEmptyWallet()
          await owner.sendTransaction({ to: wallet.address, value: BigNumber.from('1714794122122458976') })
          await contract.connect(wallet).mint(1, { value: PRICE })
          sold ++
          if (sold % 50 === 0) {
            console.log(`          === ${sold} SOLD ===`)
            expect(await contract.tokenCount()).to.equal(sold)
          }
        }

        expect(await contract.tokenCount()).to.equal(10000)

        await expect(contract.connect(buyer1).mint(1, { value: PRICE }))
                    .to.be.revertedWith('No more tokens available')
      })
    })

    describe('Withdrawals', () => {
      it('Should allow the owner to withdraw funds stored in the contract', async () => {
        const ownerBalance = await ethers.provider.getBalance(owner.address)
        expect(await ethers.provider.getBalance(contract.address)).to.equal(0)

        await contract.connect(buyer1).mint(20, { value: PRICE.mul(20) })
        await contract.connect(buyer1).mint(20, { value: PRICE.mul(20) })

        expect(await ethers.provider.getBalance(contract.address)).to.equal(PRICE.mul(40))

        // No funds sent to the owner yet.
        expect(await ethers.provider.getBalance(owner.address)).to.equal(ownerBalance)

        await expect(await contract.connect(owner).withdraw()).to.changeEtherBalance(owner, PRICE.mul(40))

        // No funds left in contract
        expect(await ethers.provider.getBalance(contract.address)).to.equal(0)
      })
    })
  })

  describe('Token Holder', () => {
    let tokenId

    beforeEach(async () => {
      const transaction = await contract.connect(buyer1).mint(1, { value: PRICE })
      const receipt = await transaction.wait()

      tokenId = receipt.events?.find(
        e => e.event === 'Transfer' && e.address === contract.address
      ).args.tokenId
    })

    describe('Show Scape', () => {
      it('Should show the Scape of a holder', async () => {
        expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)
      })

      it('Correctly links to the tokenURI', async () => {
        expect(await contract.tokenURI(tokenId)).to.equal(`ipfs://${CID}/${tokenId}/metadata.json`)
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
