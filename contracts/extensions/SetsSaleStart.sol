// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract SetsSaleStart is Ownable
{
    // Emitted when saleStart changes
    event SaleStartChanged(uint256 time);

    uint256 private _saleStart;

    // Initialize with a given timestamp when to start the sale
    constructor (uint256 time) {
        _saleStart = time;
    }

    // Returns the start of the sale in seconds since the Unix Epoch
    function saleStart() public view virtual returns (uint256) {
        return _saleStart;
    }

    // Returns true if the sale has started
    function saleStarted() public view virtual returns (bool) {
        return _saleStart <= block.timestamp;
    }

    // Modifier to make a function callable only when the sale has started
    modifier afterSaleStart() {
        require(saleStarted(), "Sale hasn't started yet");
        _;
    }

    // Sets the start of the sale. Only owners can do so
    function setSaleStart(uint256 time) public virtual onlyOwner {
        _saleStart = time;
        emit SaleStartChanged(time);
    }
}
