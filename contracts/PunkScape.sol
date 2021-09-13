// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@1001-digital/erc721-extensions/contracts/RandomlyAssigned.sol";
import "@1001-digital/erc721-extensions/contracts/WithContractMetaData.sol";
import "@1001-digital/erc721-extensions/contracts/WithFees.sol";
import "@1001-digital/erc721-extensions/contracts/WithIPFSMetaData.sol";
import "@1001-digital/erc721-extensions/contracts/WithSaleStart.sol";
import "@1001-digital/erc721-extensions/contracts/WithWithdrawals.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./CryptoPunkInterface.sol";
import "./OneDayPunk.sol";

// ████████████████████████████████████████████████████████████████████████████████████████ //
// ██                                                                                    ██ //
// ██                                                                                    ██ //
// ██     ██████  ██    ██ ███    ██ ██   ██ ███████  ██████  █████  ██████  ███████     ██ //
// ██     ██   ██ ██    ██ ████   ██ ██  ██  ██      ██      ██   ██ ██   ██ ██          ██ //
// ██     ██████  ██    ██ ██ ██  ██ █████   ███████ ██      ███████ ██████  █████       ██ //
// ██     ██      ██    ██ ██  ██ ██ ██  ██       ██ ██      ██   ██ ██      ██          ██ //
// ██     ██       ██████  ██   ████ ██   ██ ███████  ██████ ██   ██ ██      ███████     ██ //
// ██                                                                                    ██ //
// ██                                                                                    ██ //
// ████████████████████████████████████████████████████████████████████████████████████████ //

contract PunkScape is
    ERC721,
    Ownable,
    WithSaleStart,
    WithIPFSMetaData,
    RandomlyAssigned,
    WithContractMetaData,
    WithWithdrawals,
    WithFees
{
    uint256 public price = 0.02 ether;
    address private cryptoPunksAddress;
    address private oneDayPunkAddress;
    mapping(uint256 => uint256) public oneDayPunkToPunkScape;

    // Instantiate the PunkScape Contract
    constructor(
        address payable _punkscape,
        string memory _cid,
        uint256 _saleStart,
        string memory _contractMetaDataURI,
        address _cryptoPunksAddress,
        address _oneDayPunkAddress
    )
        ERC721("PunkScape", unicode"🌆")
        WithSaleStart(_saleStart)
        RandomlyAssigned(10000, 1)
        WithFees(_punkscape, 250)
        WithContractMetaData(_contractMetaDataURI)
        WithIPFSMetaData(_cid)
    {
        cryptoPunksAddress = _cryptoPunksAddress;
        oneDayPunkAddress = _oneDayPunkAddress;
    }

    function mint(uint256 amount) external payable afterSaleStart ensureAvailabilityFor(amount) {
        require(amount > 0, "Have to mint at least one punkscape.");
        require(amount <= 3, "Can't mint more than 3 punkscapes per transaction.");
        require(msg.value >= (price * amount), "Pay up, friend - it's 0.02 ETH per PunkScape.");
        OneDayPunk oneDayPunk = OneDayPunk(oneDayPunkAddress);

        // During the initial 618 minutes only ODPs can mint.
        if (block.timestamp < (saleStart() + 618 * 60)) {
            uint256 odp = oneDayPunk.tokenOf(msg.sender);
            require(
                odp >= 0,
                "You have to own a OneDayPunk to mint during the initial claiming window."
            );
            require(
                amount == 1 &&
                oneDayPunkToPunkScape[odp] == 0,
                "Can only claim one punkscape."
            );

            // We'll mint these tokens, so safe to set this.
            uint256 newScape = nextToken();
            oneDayPunkToPunkScape[odp] = newScape;
            _safeMint(msg.sender, newScape);
            return;
        }

        // Afterwards both CryptoPunk owners and OneDayPunk owners can mint up to 3 per transaction
        CryptoPunks cryptoPunks = CryptoPunks(cryptoPunksAddress);
        require(
            oneDayPunk.balanceOf(msg.sender) == 1 ||
            cryptoPunks.balanceOf(msg.sender) >= 1,
            "You have to own a CryptoPunk or a OneDayPunk to mint a PunkScape"
        );

        // Mint the new tokens
        for (uint256 index = 0; index < amount; index++) {
            uint256 newScape = nextToken();
            _safeMint(msg.sender, newScape);
        }
    }

    // Get the tokenURI for a specific token
    function tokenURI(uint256 tokenId)
        public view override(WithIPFSMetaData, ERC721)
        returns (string memory)
    {
        return WithIPFSMetaData.tokenURI(tokenId);
    }

    // Configure the baseURI for the tokenURI method.
    function _baseURI()
        internal view override(WithIPFSMetaData, ERC721)
        returns (string memory)
    {
        return WithIPFSMetaData._baseURI();
    }

    // We support the `HasSecondarySalesFees` Interface
    function supportsInterface(bytes4 interfaceId) public view override(WithFees, ERC721) returns (bool) {
        return WithFees.supportsInterface(interfaceId);
    }
}
