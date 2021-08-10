// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

// =======================================================================
// LIMITED TOKEN SUPPLY
// =======================================================================
abstract contract WithLimitedTokenSupply {
    using Counters for Counters.Counter;

    uint256 public maxCount;

    constructor (uint256 _tokenCount) {
        maxCount = _tokenCount;
    }

    // Keep track of how many we have minted
    Counters.Counter public count;

    // Enure that there are still available scapes
    modifier ensureAvailability() {
        require(count.current() < maxCount, "No more Scapes available");
        _;
    }

    function nextToken() internal ensureAvailability returns (uint256) {
        count.increment();

        return count.current();
    }
}
