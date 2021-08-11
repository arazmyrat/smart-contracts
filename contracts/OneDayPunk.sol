// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./extensions/HasContractMetaData.sol";
import "./extensions/WithLimitedTokenSupply.sol";
import "./extensions/OnePerWallet.sol";
import "./extensions/HasIPFSMetaData.sol";

import "./CryptoPunkInterface.sol";

// =============================================================================================== //
//     ____________   ___________   _________________  __   _____________  ______   _______ __     //
//     __  __ \__  | / /__  ____/   ___  __ \__    | \/ /   ___  __ \_  / / /__  | / /__  //_/     //
//     _  / / /_   |/ /__  __/      __  / / /_  /| |_  /    __  /_/ /  / / /__   |/ /__  ,<        //
//     / /_/ /_  /|  / _  /___      _  /_/ /_  ___ |  /     _  ____// /_/ / _  /|  / _  /| |       //
//     \____/ /_/ |_/  /_____/      /_____/ /_/  |_/_/      /_/     \____/  /_/ |_/  /_/ |_|       //
//                                                                                                 //
// =============================================================================================== //
//                                         a gift from jalil                                       //
//                                        to all that aim high                                     //
// =============================================================================================== //

contract OneDayPunk is
    ERC721,
    HasIPFSMetaData,
    WithLimitedTokenSupply,
    OnePerWallet,
    HasContractMetaData
{
    address private cryptopunksAddress = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;

    // Instantiate the PunkScape Contract
    constructor(
        string memory _cid,
        string memory _contractMetaDataURI
    )
        ERC721("OneDayPunk", "ODP")
        WithLimitedTokenSupply(10000)
        HasIPFSMetaData(_cid)
        HasContractMetaData(_contractMetaDataURI)
    {}

    // Claim a "One Day I'll Be A Punk"-Punk
    function claim() external {
        _claim(msg.sender);
    }

    // Claim a "One Day I'll Be A Punk"-Punk to a specific address
    function claimFor(address to) external {
        _claim(to);
    }

    // Claims a token for a specific address.
    function _claim (address to) internal ensureAvailability onePerWallet(to) {
        CryptoPunks cryptopunks = CryptoPunks(cryptopunksAddress);
        require(cryptopunks.balanceOf(to) == 0, "You lucky one already have a CryptoPunk.");

        uint256 next = nextToken();

        _safeMint(to, next);
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

    // Mark OnePerWallet implementation as override for ERC721, OnePerWallet
    function _mint(address to, uint256 tokenId) internal override(ERC721, OnePerWallet) {
        OnePerWallet._mint(to, tokenId);
    }

    // Mark OnePerWallet implementation as override for ERC721, OnePerWallet
    function _transfer(address from, address to, uint256 tokenId) internal override(ERC721, OnePerWallet) {
        OnePerWallet._transfer(from, to, tokenId);
    }

}
