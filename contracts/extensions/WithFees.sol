// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./../standards/HasSecondarySaleFees.sol";

abstract contract WithFees is HasSecondarySaleFees, ERC721 {
    address payable internal beneficiary;
    uint8 bps;

    constructor (
        address payable _beneficiary,
        uint8 _bps
    ) {
        beneficiary = _beneficiary;
        bps = _bps;
    }

    // Implement the `HasSecondarySalesFees` Contract
    function getFeeRecipients(uint256) public view override returns (address payable[] memory) {
        address payable[] memory recipients = new address payable[](1);
        recipients[0] = beneficiary;
        return recipients;
    }

    // Implement the `HasSecondarySalesFees` Contract
    function getFeeBps(uint256) public view override returns (uint256[] memory) {
        uint256[] memory bpsArray = new uint256[](1);
        bpsArray[0] = bps;
        return bpsArray;
    }

    // We support the `HasSecondarySalesFees` Interface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC165) returns (bool) {
        return interfaceId == type(HasSecondarySaleFees).interfaceId
            || ERC721.supportsInterface(interfaceId);
    }
}
