// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

// =======================================================================
// RANDOM TOKEN ASSIGNMENT
// =======================================================================
abstract contract RandomlyAssigned {
    using Counters for Counters.Counter;

    // There is 10k PunkScapes
    uint256 public constant MAX_COUNT = 10000;

    // Keep track of how many we have minted
    Counters.Counter public count;

    // Used for random index assignment
    uint256 internal nonce = 0;
    uint256[MAX_COUNT] internal indices;

    // Enure that there are still available scapes
    modifier ensureAvailability() {
        require(count.current() < MAX_COUNT, "No more Scapes available");
        _;
    }

    function randomIndex() internal returns (uint256) {
        uint256 totalSize = MAX_COUNT - count.current();
        uint256 index = uint256(
            keccak256(
                abi.encodePacked(nonce, msg.sender, block.difficulty, block.timestamp)
            )
        ) % totalSize;
        uint256 value = 0;

        if (indices[index] != 0) {
            value = indices[index];
        } else {
            value = index;
        }

        // Move last value to selected position
        if (indices[totalSize - 1] == 0) {
            // Array position not initialized, so use position
            indices[index] = totalSize - 1;
        } else {
            // Array position holds a value so use that
            indices[index] = indices[totalSize - 1];
        }

        nonce++;

        // There goes another one
        count.increment();

        return value;
    }
}
