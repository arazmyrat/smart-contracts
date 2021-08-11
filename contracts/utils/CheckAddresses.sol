// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library CheckAddresses {
    function isContract(address account) public view returns (bool) {
        return getSize(account) > 0;
    }

    function isExternal(address account) public view returns (bool) {
        return getSize(account) == 0;
    }

    function getSize(address account) internal view returns (uint256) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size;
    }
}
