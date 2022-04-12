// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title ERC-20 token that implement crosschain bridge feature.
contract BridgeToken is ERC20, ERC20Burnable, Ownable {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    event SwapInitialized(address from, address to, uint256 amount, uint256 nonce);
    event Redeem(address to, uint256 amount, uint256 nonce);

    /// @dev Address of validator. Must be different for different sides of bridge to prevent double redeem.
    address public validator;
    /// @dev Swap id
    Counters.Counter public swapId;
    /// @dev Swap id that already used (redeemed)
    mapping(uint256 => bool) public redeemedSwaps;

    constructor(
        string memory name,
        string memory symbol,
        address validator_
    ) ERC20(name, symbol) {
        validator = validator_;
    }

    function setValidator(address validator_) external onlyOwner {
        validator = validator_;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /// @dev request swap tokens to other evm network
    function swap(address destinationAddress, uint256 value) external {
        _burn(msg.sender, value);
        if (destinationAddress == address(0)) {
            destinationAddress = msg.sender;
        }
        emit SwapInitialized(msg.sender, destinationAddress, value, swapId.current());
        swapId.increment();
    }

    /// @dev redeem tokens that was swapped on other side
    function redeem(
        address destinationAddress,
        uint256 value,
        uint256 swapId_,
        bytes memory signature
    ) external {
        bytes32 messageHash = keccak256(abi.encodePacked(destinationAddress, value, swapId_))
            .toEthSignedMessageHash();
        require(!redeemedSwaps[swapId_], "Already redeemed");
        require(isValidSignature(messageHash, signature), "Signature not valid");
        redeemedSwaps[swapId_] = true;
        _mint(destinationAddress, value);
        emit Redeem(destinationAddress, value, swapId_);
    }

    /// @dev Check signature for message
    function isValidSignature(bytes32 messageHash, bytes memory signature) private view returns (bool) {
        return messageHash.recover(signature) == validator;
    }
}
