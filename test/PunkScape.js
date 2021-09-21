const { parseUnits } = require('ethers/lib/utils')
const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { daysInSeconds, nowInSeconds } = require('./../helpers/time')
const { BigNumber } = require('ethers')

const networkConfig = hre.config.networks[hre.network.name]
const PRICE = parseUnits('0.03', 'ether')
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
      punkscape,
      buyer1,
      buyer2,
      addrs,
      larvaLabs

  const mintOneDayPunkFor = async (buyer) => {
    const transaction = await oneDayPunkContract.connect(buyer).claim()
    const receipt = await transaction.wait()

    return receipt.events?.find(e => e.event === 'Transfer').args.tokenId
  }

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
    [ owner, punkscape, buyer1, buyer2, ...addrs ] = await ethers.getSigners()

    // Deploy the smart contract
    oneDayPunkContract = await OneDayPunk.deploy(
      CID,
      'https://punkscape.xyz/contract-meta',
      networkConfig.CryptoPunksAddress
    )

    contract = await PunkScape.deploy(
      punkscape.address,
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

  describe('Update CID', () => {
    it('Allows the owner to update the CID before sale starts', async () => {
      futureSaleStart = (await ethers.provider.getBlock('latest')).timestamp + 180

      contract = await PunkScape.deploy(
        punkscape.address,
        CID,
        futureSaleStart,
        'https://PunkScape.xyz/contract-meta',
        networkConfig.CryptoPunksAddress,
        oneDayPunkContract.address
      )

      await contract.setCID('NEW_IPFS_HASH')
      expect(await contract.cid()).to.equal('NEW_IPFS_HASH')
    })

    it('Does not allow the owner to update the CID after sale starts', async () => {
      await expect(contract.setCID('NEW_IPFS_HASH'))
        .to.be.revertedWith('Sale has already started')
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
          punkscape.address,
          CID,
          futureSaleStart,
          'https://PunkScape.xyz/contract-meta',
          networkConfig.CryptoPunksAddress,
          oneDayPunkContract.address
        )
      })

      it('Should expose the saleStart time', async () => {
        expect(await contract.saleStart()).to.equal(futureSaleStart)
      })

      it('Should be able to change sale start before the sale has started', async () => {
        await contract.connect(owner).setSaleStart(nowInSeconds() + daysInSeconds(1))
      })

      it('Should not be able to change sale start after the sale has started', async () => {
        await contract.connect(owner).setSaleStart(START_SALE)
        await expect(contract.connect(owner).setSaleStart(nowInSeconds() - daysInSeconds(1)))
          .to.be.revertedWith('Sale has already started')
      })

      it('Should not mint if sale hasn\'t started yet', async () => {
        await expect(contract.connect(buyer1).claimForOneDayPunk(0, { value: PRICE }))
          .to.be.revertedWith('Sale hasn\'t started yet')

        await expect(contract.connect(buyer1).claimAfter618Minutes(1, { value: PRICE }))
          .to.be.revertedWith('General claiming phase starts 618 minutes after sale start')
      })

      it('Should allow mint if sale has started', async () => {
        // Has to own an ODP
        const odp = await mintOneDayPunkFor(buyer1)

        // Has to have started sale
        await contract.connect(owner).setSaleStart(START_SALE)

        // Try with less price
        await expect(contract.connect(buyer1).claimForOneDayPunk(odp, { value: PRICE.sub(10) }))
                      .to.be.revertedWith(`Pay up, friend`)

        // Buy it
        await expect(contract.connect(buyer1).claimForOneDayPunk(odp, { value: PRICE }))
          .to.emit(contract, 'Transfer')

        // Can't claim before 618 minutes are over
        await expect(contract.connect(buyer1).claimAfter618Minutes(1, { value: PRICE }))
          .to.be.revertedWith(`General claiming phase starts 618 minutes after sale start`)
      })

      it('Should emit SaleStartChanged when the sale start changes', async () => {
        const time = nowInSeconds() + daysInSeconds(1)
        await expect(contract.connect(owner).setSaleStart(time))
          .to.emit(contract, 'SaleStartChanged')
          .withArgs(time)
      })
    })

    describe('Mint', () => {
      describe('Initial 618 minutes', () => {
        it('Wallets (w/o ODPs) should be able to mint a scape for ODP (holders)', async () => {
          expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(0)

          const odp = await mintOneDayPunkFor(buyer2)
          const transaction = await contract.connect(buyer1).claimForOneDayPunk(odp, { value: PRICE })
          const receipt = await transaction.wait()
          const tokenId = receipt.events?.find(
            e => e.event === 'Transfer' && e.address === contract.address
          ).args.tokenId
          expect(await contract.ownerOf(tokenId)).to.equal(buyer2.address)
        })

        it('Holders of a OneDayPunk should be able to mint one scape during initial claiming phase', async () => {
          // buyer has a one day punk
          await oneDayPunkContract.connect(buyer1).claim()
          expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(1)
          const odp = await oneDayPunkContract.tokenOf(buyer1.address)

          const transaction = await contract.connect(buyer1).claimForOneDayPunk(odp, { value: PRICE })
          const receipt = await transaction.wait()
          tokenId = receipt.events?.find(
            e => e.event === 'Transfer' && e.address === contract.address
          ).args.tokenId

          expect(await contract.ownerOf(tokenId)).to.equal(buyer1.address)
          expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(1)

          await expect(contract.connect(buyer1).claimForOneDayPunk(odp, { value: PRICE }))
            .to.be.revertedWith("PunkScape for this OneDayPunk has already been claimed")

          // When token is transferred out i still can't redeem a new token
          const transferRequest = oneDayPunkContract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, odp)
          await expect(transferRequest)
            .to.emit(oneDayPunkContract, 'Transfer')
            .withArgs(buyer1.address, buyer2.address, odp)
          await (await transferRequest).wait()

          expect(await oneDayPunkContract.balanceOf(buyer1.address)).to.equal(0)
          expect(await oneDayPunkContract.balanceOf(buyer2.address)).to.equal(1)
          await expect(contract.connect(buyer1).claimForOneDayPunk(0, { value: PRICE }))
            .to.be.revertedWith("ERC721: owner query for nonexistent token")

          // New ODP holder also can't claim a PunkScape because it has already been claimed for this ODP
          await expect(contract.connect(buyer2).claimForOneDayPunk(odp, { value: PRICE }))
            .to.be.revertedWith("PunkScape for this OneDayPunk has already been claimed")
        })

        it('Should not allow to claim multiple PunkScapes in one transaction during initial claiming phase', async () => {
          await oneDayPunkContract.connect(buyer1).claim()

          await expect(contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) }))
            .to.be.revertedWith('General claiming phase starts 618 minutes after sale start')
        })

        it('Holders of CryptoPunks should not be able to mint a scape during initial claiming phase', async () => {
          await expect(contract.connect(larvaLabs).claimAfter618Minutes(1, { value: PRICE }))
            .to.be.revertedWith('General claiming phase starts 618 minutes after sale start')
        })

        it('Holders of CryptoPunks should be able to mint a scape for an ODP holder during initial claiming phase', async () => {
          const odp = await mintOneDayPunkFor(buyer1)

          await expect(contract.connect(larvaLabs).claimForOneDayPunk(odp, { value: PRICE }))
            .to.emit(contract, 'Transfer')
        })

        it('Updates the sold count', async () => {
          const odp1 = await mintOneDayPunkFor(buyer1)
          const odp2 = await mintOneDayPunkFor(buyer2)

          expect(await contract.tokenCount()).to.equal(0)

          await contract.connect(buyer1).claimForOneDayPunk(odp1, { value: PRICE })
          expect(await contract.tokenCount()).to.equal(1)

          await contract.connect(buyer2).claimForOneDayPunk(odp2, { value: PRICE })
          expect(await contract.tokenCount()).to.equal(2)
        })
      })

      describe('Claiming after 618 minutes', () => {
        beforeEach(async () => {
          await oneDayPunkContract.connect(buyer1).claim()

          await network.provider.send("evm_increaseTime", [618 * 60])
          await network.provider.send("evm_mine")
        })

        it('Holders of CryptoPunks should able to mint scapes after initial claiming phase', async () => {
          await expect(contract.connect(larvaLabs).claimAfter618Minutes(1, { value: PRICE }))
            .to.emit(contract, 'Transfer')
        })

        it('Should allow to mint multiple PunkScapes in one transaction', async () => {
          const transaction = await contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) })
          const receipt = await transaction.wait()
          events = receipt.events?.filter(
            e => e.event === 'Transfer' && e.address === contract.address
          )

          expect(events.length).to.equal(3)
          expect(await contract.balanceOf(buyer1.address)).to.equal(3)
        })

        it('Should allow to mint PunkScapes over multiple transactions', async () => {
          await contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) })
          await contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) })
          await contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) })
          expect(await contract.balanceOf(buyer1.address)).to.equal(9)
        })

        it('Fails if transaction value is less than 0.03 ETH per PunkScape', async () => {
          await expect(contract.connect(buyer1).claimAfter618Minutes(1, { value: PRICE.sub(10) }))
                      .to.be.revertedWith(`Pay up, friend`)

          await expect(contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(2) }))
                      .to.be.revertedWith(`Pay up, friend`)

          expect(await contract.balanceOf(buyer1.address)).to.equal(0)
        })

        it('Fails if amount isn\'t allowed', async () => {
          await expect(contract.connect(buyer1).claimAfter618Minutes(0, { value: PRICE }))
                      .to.be.revertedWith(`Have to mint at least one PunkScape`)

          await expect(contract.connect(buyer1).claimAfter618Minutes(4, { value: PRICE.mul(4) }))
                      .to.be.revertedWith(`Can't mint more than 3 PunkScapes per transaction`)

          expect(await contract.balanceOf(buyer1.address)).to.equal(0)
        })

        it.skip('Sells 10000, then fails on further tries', async () => {
          let sold = 0
          let wallet
          const start = nowInSeconds()

          console.log(`          Started selling`)
          while (sold < 10000) {
            wallet = waffle.provider.createEmptyWallet()
            await owner.sendTransaction({ to: wallet.address, value: BigNumber.from('1714794122122458976') })
            await oneDayPunkContract.connect(wallet).claim()
            await contract.connect(wallet).claimAfter618Minutes(2, { value: PRICE.mul(2) })
            sold += 2
            if (sold % 50 === 0) {
              console.log(`            === ${sold} SOLD ===`, `${nowInSeconds() - start}s`)
              expect(await contract.tokenCount()).to.equal(sold)
            }
          }

          expect(await contract.tokenCount()).to.equal(10000)

          await expect(contract.connect(buyer1).claimAfter618Minutes(1, { value: PRICE }))
                      .to.be.revertedWith('No more tokens available')
        })
      })
    })
  })

  describe('Withdrawals', () => {
    it('Should allow the owner to withdraw funds stored in the contract', async () => {
      await network.provider.send("evm_increaseTime", [618 * 60])
      await network.provider.send("evm_mine")

      const ownerBalance = await ethers.provider.getBalance(owner.address)
      expect(await ethers.provider.getBalance(contract.address)).to.equal(0)

      await oneDayPunkContract.connect(buyer1).claim()
      await contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) })
      await contract.connect(buyer1).claimAfter618Minutes(3, { value: PRICE.mul(3) })

      expect(await ethers.provider.getBalance(contract.address)).to.equal(PRICE.mul(6))

      // No funds sent to the owner yet.
      expect(await ethers.provider.getBalance(owner.address)).to.equal(ownerBalance)

      await expect(await contract.connect(owner).withdraw()).to.changeEtherBalance(owner, PRICE.mul(6))

      // No funds left in contract
      expect(await ethers.provider.getBalance(contract.address)).to.equal(0)
    })
  })

  describe('Token Holder', () => {
    let tokenId

    beforeEach(async () => {
      await oneDayPunkContract.connect(buyer1).claim()
      const transaction = await contract.connect(buyer1).claimAfter618Minutes(1, { value: PRICE })
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
        const otherTokenId = tokenId === 10000 ? tokenId - 1 : tokenId + 1

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

    describe('Market Offers', () => {
      const price = ethers.utils.parseEther('2')
      let seller, buyer;

      beforeEach(async () => {
        seller = buyer1
        buyer = buyer2
        contract.connect(seller)
      })

      describe('Private Offers', () => {
        it('Should allow the owner of a token to add a new private offer', async () => {
          await expect(contract.offerFor(tokenId))
            .to.be.revertedWith('No active offer for this item')

          expect(await contract.connect(seller).makeOfferTo(tokenId, price, buyer.address))
            .to.emit(contract, 'OfferCreated')
            .withArgs(tokenId, price, buyer.address);

          expect(await contract.offerFor(tokenId)).to.eql([ price, buyer.address ])
        })

        it('Should allow the private buyer to purchase the offered item', async () => {
          expect(await contract.ownerOf(tokenId)).to.equal(seller.address)

          expect(await contract.connect(seller).makeOfferTo(tokenId, price, buyer.address))
            .to.emit(contract, 'OfferCreated')
            .withArgs(tokenId, price, buyer.address);

          await expect(await contract.connect(buyer).buy(tokenId, { value: price }))
            .to.emit(contract, 'Sale')
            .withArgs(tokenId, seller.address, buyer.address, price)

          expect(await contract.ownerOf(tokenId)).to.equal(buyer.address)
        })

        it('Should not allow the any buyer to purchase a privately offered item', async () => {
          expect(await contract.ownerOf(tokenId)).to.equal(seller.address)

          expect(await contract.connect(seller).makeOfferTo(tokenId, price, buyer.address))
            .to.emit(contract, 'OfferCreated')
            .withArgs(tokenId, price, buyer.address);

          const otherBuyer = addrs[0]

          await expect(contract.connect(otherBuyer).buy(tokenId, { value: price }))
            .to.be.revertedWith(`Can't buy a privately offered item`)

          expect(await contract.ownerOf(tokenId)).to.equal(seller.address)
        })
      })

      describe('Public Offers', () => {
        it('Should allow the owner of a token to add a new offer', async () => {
          await expect(contract.offerFor(tokenId))
            .to.be.revertedWith('No active offer for this item')

          expect(await contract.connect(seller).makeOffer(tokenId, price))
            .to.emit(contract, 'OfferCreated')
            .withArgs(tokenId, price, ethers.constants.AddressZero);

          expect(await contract.offerFor(tokenId)).to.eql([ price, ethers.constants.AddressZero ])
        })

        it('Should not allow non-owners to make offers', async () => {
          await expect(contract.connect(buyer).makeOffer(tokenId, price))
            .to.be.revertedWith('Caller is neither owner nor approved')
        })

        it('Should allow a buyer to purchase an offered item', async () => {
          expect(await contract.ownerOf(tokenId)).to.equal(seller.address)

          await contract.connect(seller).makeOffer(tokenId, price)

          await expect(await contract.connect(buyer).buy(tokenId, { value: price }))
            .to.emit(contract, 'Sale')
            .withArgs(tokenId, seller.address, buyer.address, price)
            .to.emit(contract, 'Transfer')
            .withArgs(seller.address, buyer.address, tokenId)
            .to.changeEtherBalance(seller, price, {
              provider: ethers.getDefaultProvider(),
            })

          expect(await contract.ownerOf(tokenId)).to.equal(buyer.address)
        })

        it('Should not allow a buyer to purchase an item offered for less than the set price', async () => {
          await contract.connect(seller).makeOffer(tokenId, price)

          await expect(contract.connect(buyer).buy(tokenId, { value: price.sub(1) }))
            .to.be.revertedWith('Price not met')
        })

        it('Should not allow a buyer to purchase an item that is not offered', async () => {
          await expect(contract.connect(buyer).buy(tokenId, { value: price }))
            .to.be.revertedWith('Item not for sale')
        })

        it('Should allow a seller to cancel an active offer', async () => {
          await contract.connect(seller).makeOffer(tokenId, price)
          await expect(contract.connect(seller).cancelOffer(tokenId))
            .to.emit(contract, 'OfferWithdrawn')
            .withArgs(tokenId)

          await expect(contract.offerFor(tokenId))
            .to.be.revertedWith('No active offer for this item')
        })
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
      expect(JSON.stringify(recipients)).to.equal(JSON.stringify([punkscape.address]))
    })
    it('Reports fee BPS for a token', async () => {
      const bpsArray = await contract.getFeeBps(80)
      expect(JSON.stringify(bpsArray.map(bps => bps.toNumber()))).to.equal(JSON.stringify([250]))
    })
  })
})
