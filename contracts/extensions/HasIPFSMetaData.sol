// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// =======================================================================
// HANDLE JSON METADATA ON IPFS
// =======================================================================
abstract contract HasIPFSMetaData is ERC721 {
    using Strings for uint256;

    string public cid;

    constructor (string memory _cid) {
        cid = _cid;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(
            _baseURI(), "/", tokenId.toString(), ".json"
        ));
    }

    // Configure the baseURI for the tokenURI method.
    function _baseURI() internal view virtual override returns (string memory) {
        return string(abi.encodePacked("ipfs://", cid));
    }

}
