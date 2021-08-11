// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


import "./extensions/SetsSaleStart.sol";
import "./extensions/HasContractMetaData.sol";
import "./extensions/WithFees.sol";
import "./extensions/RandomlyAssigned.sol";
import "./extensions/HasIPFSMetaData.sol";

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
    SetsSaleStart,
    HasIPFSMetaData,
    RandomlyAssigned,
    HasContractMetaData,
    WithFees
{
    using Counters for Counters.Counter;

    uint256 public price = 0.02 ether;
    address private cryptopunksAddress = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
    address private oneDayPunkAddress;

    // Instantiate the PunkScape Contract
    constructor(
        address payable _jalil,
        string memory _cid,
        uint256 _saleStart,
        string memory _contractMetaDataURI,
        address _oneDayPunkAddress
    )
        ERC721("PunkScape", "SCAPE")
        SetsSaleStart(_saleStart)
        WithFees(_jalil, 250)
        HasContractMetaData(_contractMetaDataURI)
        HasIPFSMetaData(_cid)
    {
        oneDayPunkAddress = _oneDayPunkAddress;
    }

    // Mint one PunkScape
    function mint() external payable afterSaleStart ensureAvailability {
        require(msg.value >= price, "Sorry it is 0.02ETH, friend");

        // If you don't have a CryptoPunk, you get a "One Day I'll Be A Punk"-Punk
        CryptoPunks cryptopunks = CryptoPunks(cryptopunksAddress);
        OneDayPunk oneDayPunk = OneDayPunk(oneDayPunkAddress);
        if (
            cryptopunks.balanceOf(msg.sender) == 0 &&
            oneDayPunk.balanceOf(msg.sender) == 0
        ) {
            oneDayPunk.claimFor(msg.sender);
        }

        // Mint the new token
        uint256 newScape = randomIndex();
        _safeMint(msg.sender, newScape);

        // Make it rain
        beneficiary.transfer(msg.value);
    }

    // TODO: Mint up to 50 at once

    // Get the tokenURI for a specific token
    function tokenURI(uint256 tokenId)
        public view override(HasIPFSMetaData, ERC721)
        returns (string memory)
    {
        return HasIPFSMetaData.tokenURI(tokenId);
    }

    // Configure the baseURI for the tokenURI method.
    function _baseURI()
        internal view override(HasIPFSMetaData, ERC721)
        returns (string memory)
    {
        return HasIPFSMetaData._baseURI();
    }

    // We support the `HasSecondarySalesFees` Interface
    function supportsInterface(bytes4 interfaceId) public view override(WithFees, ERC721) returns (bool) {
        return WithFees.supportsInterface(interfaceId);
    }
}
