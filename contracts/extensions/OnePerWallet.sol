// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// =======================================================================
// ADJUST LOGIC FOR BALANCE AND OWNED
// =======================================================================
abstract contract OnePerWallet is ERC721 {
    // Mapping owner address to token
    mapping (address => uint256) private _ownedToken;

    // Only allow one nim per wallet
    modifier onePerWallet(address wallet) {
        require(balanceOf(wallet) == 0, "Can only mint one Nim per wallet");
        _;
    }

    // Get the the token of an owner
    function tokenOf(address owner) public view virtual returns (uint256) {
        return _ownedToken[owner];
    }

    // Store _ownedToken instead of _balances
    function _mint(address to, uint256 tokenId) internal virtual override onePerWallet(to) {
        super._mint(to, tokenId);

        _ownedToken[to] = tokenId;
    }

    // Adjust `_ownedToken` instead of `_balances`
    function _transfer(address from, address to, uint256 tokenId) internal virtual override onePerWallet(to) {
        super._transfer(from, to, tokenId);

        _ownedToken[from] = 0;
        _ownedToken[to] = tokenId;
    }
}
