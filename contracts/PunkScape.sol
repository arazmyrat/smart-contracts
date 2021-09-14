// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@1001-digital/erc721-extensions/contracts/WithContractMetaData.sol";
import "@1001-digital/erc721-extensions/contracts/RandomlyAssigned.sol";
import "@1001-digital/erc721-extensions/contracts/WithIPFSMetaData.sol";
import "@1001-digital/erc721-extensions/contracts/WithMarketOffers.sol";
import "@1001-digital/erc721-extensions/contracts/WithWithdrawals.sol";
import "@1001-digital/erc721-extensions/contracts/WithSaleStart.sol";
import "@1001-digital/erc721-extensions/contracts/WithFees.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./CryptoPunkInterface.sol";
import "./OneDayPunk.sol";

// ████████████████████████████████████████████████████████████████████████████████████████ //
// ██                                                                                    ██ //
// ██                                                                                    ██ //
// ██     ██████  ██    ██ ███    ██ ██   ██ ███████  ██████  █████  ██████  ███████     ██ //
// ██     ██   ██ ██    ██ ████   ██ ██  ██  ██      ██      ██   ██ ██   ██ ██          ██ //
// ██     ██████  ██    ██ ██ ██  ██ █████   ███████ ██      ███████ ██████  █████       ██ //
// ██     ██      ██    ██ ██  ██ ██ ██  ██       ██ ██      ██   ██ ██      ██          ██ //
// ██     ██       ██████  ██   ████ ██   ██ ███████  ██████ ██   ██ ██      ███████     ██ //
// ██                                                                                    ██ //
// ██                                                                                    ██ //
// ████████████████████████████████████████████████████████████████████████████████████████ //

contract PunkScape is
    ERC721,
    Ownable,
    WithFees,
    WithSaleStart,
    WithWithdrawals,
    WithIPFSMetaData,
    RandomlyAssigned,
    WithMarketOffers,
    WithContractMetaData
{
    uint256 public price = 0.028 ether;
    address private cryptoPunksAddress;
    address private oneDayPunkAddress;
    mapping(uint256 => uint256) public oneDayPunkToPunkScape;

    // Instantiate the PunkScape Contract
    constructor(
        address payable _punkscape,
        string memory _cid,
        uint256 _saleStart,
        string memory _contractMetaDataURI,
        address _cryptoPunksAddress,
        address _oneDayPunkAddress
    )
        ERC721("PunkScape", unicode"🌆")
        WithIPFSMetaData(_cid)
        WithFees(_punkscape, 250)
        WithSaleStart(_saleStart)
        RandomlyAssigned(10000, 1)
        WithContractMetaData(_contractMetaDataURI)
    {
        cryptoPunksAddress = _cryptoPunksAddress;
        oneDayPunkAddress = _oneDayPunkAddress;
    }

    function claimForOneDayPunk() external payable
        afterSaleStart
        ensureAvailability
    {
        OneDayPunk oneDayPunk = OneDayPunk(oneDayPunkAddress);
        uint256 odp;

        try oneDayPunk.tokenOf(msg.sender) returns (uint256 _odp) {
            odp = _odp;
        } catch (bytes memory) {
            revert(
                "You have to own a OneDayPunk to claim a PunkScape during the initial 618 minutes"
            );
        }

        require(
            oneDayPunkToPunkScape[odp] == 0,
            "PunkScape for this OneDayPunk has already been claimed"
        );

        // Get the token ID
        uint256 newScape = nextToken();

        // Redeem the PunkScape for the given OneDayPunk
        oneDayPunkToPunkScape[odp] = newScape;

        // Mint the token
        _safeMint(msg.sender, newScape);
    }

    function claimAfter618Minutes(uint256 amount) external payable
        ensureAvailabilityFor(amount)
    {
        require(
            block.timestamp > (saleStart() + 618 * 60),
            "General claiming phase starts 618 minutes after sale start"
        );
        require(
            amount > 0,
            "Have to mint at least one PunkScape"
        );
        require(
            amount <= 3,
            "Can't mint more than 3 PunkScapes per transaction"
        );
        require(
            msg.value >= (price * amount),
            "Pay up, friend"
        );

        // Both CryptoPunk owners and OneDayPunk owners can mint up to 3 per transaction
        CryptoPunks cryptoPunks = CryptoPunks(cryptoPunksAddress);
        OneDayPunk oneDayPunk = OneDayPunk(oneDayPunkAddress);
        require(
            oneDayPunk.balanceOf(msg.sender) == 1 ||
            cryptoPunks.balanceOf(msg.sender) >= 1,
            "You have to own a CryptoPunk or a OneDayPunk to mint a PunkScape"
        );

        // Mint the new tokens
        for (uint256 index = 0; index < amount; index++) {
            uint256 newScape = nextToken();
            _safeMint(msg.sender, newScape);
        }
    }

    // Get the tokenURI for a specific token
    function tokenURI(uint256 tokenId)
        public view override(WithIPFSMetaData, ERC721)
        returns (string memory)
    {
        return WithIPFSMetaData.tokenURI(tokenId);
    }

    // Configure the baseURI for the tokenURI method.
    function _baseURI()
        internal view override(WithIPFSMetaData, ERC721)
        returns (string memory)
    {
        return WithIPFSMetaData._baseURI();
    }

    // We support the `HasSecondarySalesFees` Interface
    function supportsInterface(bytes4 interfaceId)
        public view override(WithFees, ERC721)
        returns (bool)
    {
        return WithFees.supportsInterface(interfaceId);
    }
}
