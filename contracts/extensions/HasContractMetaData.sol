// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// =======================================================================
// DEFINE CONTRACT LEVEL META DATA FOR OPENSEA
// =======================================================================
abstract contract HasContractMetaData is Ownable {

    string private _contractURI;

    // Initialize
    constructor (string memory uri) {
        _contractURI = uri;
    }

    // Update the contract URI
    function setContractURI(string memory uri) public virtual onlyOwner {
        _contractURI = uri;
    }

    // Expose the contractURI
    function contractURI() public view virtual returns (string memory) {
        return _contractURI;
    }

}
