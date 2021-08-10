// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./extensions/SetsSaleStart.sol";
import "./extensions/HasContractMetaData.sol";
import "./extensions/HasSecondarySaleFees.sol";
import "./extensions/RandomlyAssigned.sol";
import "./extensions/HasIPFSMetaData.sol";

import "./CryptoPunkInterface.sol";

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
    HasSecondarySaleFees
{
    using Counters for Counters.Counter;

    address payable internal jalil;
    uint256 public price = 0.02 ether;
    address private cryptopunksAddress = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
    string public cid;

    // Instantiate the PunkScape Contract
    constructor(
        address payable _jalil,
        string memory _cid,
        uint256 _saleStart,
        string memory _contractMetaDataURI
    )
        ERC721("PunkScape", "SCAPE")
        SetsSaleStart(_saleStart)
        HasContractMetaData(_contractMetaDataURI)
    {
        jalil = _jalil;
        cid = _cid;
    }

    // Mint one PunkScape
    function mint() external payable afterSaleStart ensureAvailability {
        require(msg.value >= price, "Sorry it is 0.02ETH, friend");

        // CryptoPunks cryptopunks = CryptoPunks(cryptopunksAddress);
        // bool hasPunk = cryptopunks.balanceOf(msg.sender) > 0;
        // // TODO: If hasPunk === false, then mint OneDayPunk

        jalil.transfer(msg.value);

        uint256 newScape = randomIndex();

        _safeMint(msg.sender, newScape);
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
    function _baseURI() internal view override returns (string memory) {
        return string(abi.encodePacked("ipfs://", cid));
    }

    // Implement the `HasSecondarySalesFees` Contract
    function getFeeRecipients(uint256) public view override returns (address payable[] memory) {
        address payable[] memory recipient = new address payable[](1);
        recipient[0] = jalil;
        return recipient;
    }

    // Implement the `HasSecondarySalesFees` Contract
    function getFeeBps(uint256) public pure override returns (uint256[] memory) {
        uint256[] memory bps = new uint256[](1);
        bps[0] = 250;
        return bps;
    }

    // We support the `HasSecondarySalesFees` Interface
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC165) returns (bool) {
        return interfaceId == type(HasSecondarySaleFees).interfaceId
            || ERC721.supportsInterface(interfaceId);
    }
}
