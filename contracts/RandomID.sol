// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

import "hardhat/console.sol";

// =======================================================================
// RANDOM ID
// =======================================================================
contract RandomID {
    using Counters for Counters.Counter;

    // There is 10k PunkScapes
    uint256 public constant MAX_COUNT = 12;

    // Keep track of how many we have minted
    Counters.Counter public count;

    // Used for random index assignment
    Counters.Counter internal nonce;
    uint256[MAX_COUNT] public indices;

    event NewID(uint256 indexed id);

    // Enure that there are still available scapes
    modifier ensureAvailability() {
        require(count.current() < MAX_COUNT, "No more Scapes available");
        _;
    }

    function randomIndex() public ensureAvailability returns (uint256) {
        uint256 totalSize = MAX_COUNT - count.current();
        uint256 random = uint256(keccak256(
            abi.encodePacked(nonce.current(), msg.sender, block.difficulty, block.timestamp)
        ));
        uint256 index = random % totalSize;

        // console.log("Current count: %s", count.current());
        // console.log("Total size: %s", totalSize);
        // console.log("Randum Number Index: %s", index);

        uint256 value = 0;
        // console.log("indices[index] != 0: %s", indices[index] != 0);
        if (indices[index] == 0) {
            value = index;
        } else {
            value = indices[index];
        }
        // console.log("value: %s", value);
        emit NewID(value);

        // Increment counts
        count.increment();
        nonce.increment();

        // console.log("New count: %s", count.current());

        // Move last value to selected position
        // console.log("First if; indices[totalSize - 1]: %s; Condition: %s", indices[totalSize - 1], indices[totalSize - 1] == 0);
        if (indices[totalSize - 1] == 0) {
            // Max array position not initialized, so mark position
            indices[index] = totalSize - 1;
        } else {
            // Max array position holds a value so copy that
            indices[index] = indices[totalSize - 1];
        }
        // console.log("indices[index]: %s", indices[index]);

        // console.log("==============================================");
        // console.log("Indices: %s-%s-%s", indices[0], indices[1], indices[2]);
        // console.log(
        //     "         %s-%s-%s",
        //     indices[3],
        //     indices[4],
        //     indices[5]
        // );
        // console.log(
        //     "         %s-%s-%s",
        //     indices[6],
        //     indices[7],
        //     indices[8]
        // );
        // console.log(
        //     "         %s-%s-%s",
        //     indices[9],
        //     indices[10],
        //     indices[11]
        // );
        // console.log("==============================================");
        // console.log("==============================================");

        return value;
    }
}
