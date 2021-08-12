// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@1001-digital/erc721-extensions/contracts/RandomlyAssigned.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./extensions/SetsSaleStart.sol";
import "./extensions/HasContractMetaData.sol";
import "./extensions/WithFees.sol";
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
        RandomlyAssigned(10000, 0)
        WithFees(_jalil, 250)
        HasContractMetaData(_contractMetaDataURI)
        HasIPFSMetaData(_cid)
    {
        oneDayPunkAddress = _oneDayPunkAddress;
    }

    // Mint multiple PunkScapes
    function mint(uint256 amount) external payable afterSaleStart ensureAvailability {
        require(amount > 0, "Have to mint at least one punkscape.");
        require(amount <= 50, "Can't mint more than 50 punkscapes per transaction.");
        require(msg.value >= (price * amount), "Pay up, friend - it's 0.02 ETH per PunkScape");
        require((balanceOf(msg.sender) + amount) <= 200, "I love you, but 200 PunkScapes is enough to start with :-)");

        // If you don't have a CryptoPunk, you get a "One Day I'll Be A Punk"-Punk
        CryptoPunks cryptopunks = CryptoPunks(cryptopunksAddress);
        OneDayPunk oneDayPunk = OneDayPunk(oneDayPunkAddress);
        if (
            cryptopunks.balanceOf(msg.sender) == 0 &&
            oneDayPunk.balanceOf(msg.sender) == 0
        ) {
            oneDayPunk.claimFor(msg.sender);
        }

        // Mint the new tokens
        for (uint256 index = 0; index < amount; index++) {
            uint256 newScape = nextToken();
            _safeMint(msg.sender, newScape);
        }

        // Make it rain
        beneficiary.transfer(msg.value);
    }

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
