// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IBuildersTreasury} from "./interfaces/builders/IBuildersTreasury.sol";

contract BuildersTreasury is IBuildersTreasury, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // Address of the Builders contract that can send rewards
    address public builders;
    
    // Address of the reward token (e.g., USDC)
    address public rewardToken;
    
    // Total rewards distributed
    uint256 public distributedRewards;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }
    
    function BuildersTreasury_init(address rewardToken_) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        
        rewardToken = rewardToken_;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IBuildersTreasury).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
    
    modifier onlyBuilders() {
        require(msg.sender == builders, "BT: only builders can call");
        _;
    }
    
    function setBuilders(address builders_) external onlyOwner {
        require(builders_ != address(0), "BT: invalid builders address");
        builders = builders_;
        emit BuildersSet(builders_);
    }
    
    function sendRewards(address receiver_, uint256 amount_) external onlyBuilders {
        require(receiver_ != address(0), "BT: invalid receiver address");
        require(amount_ > 0, "BT: amount must be greater than 0");
        
        // Update distributed rewards
        distributedRewards += amount_;
        
        // Transfer rewards to receiver
        IERC20(rewardToken).safeTransfer(receiver_, amount_);
        
        emit RewardSent(receiver_, amount_);
    }
    
    function getAllRewards() external view returns (uint256) {
        // Get current balance plus already distributed rewards
        return IERC20(rewardToken).balanceOf(address(this)) + distributedRewards;
    }
    
    // Additional helper functions
    
    // Emergency withdrawal of rewards by owner
    function emergencyWithdraw(address token_, address to_, uint256 amount_) external onlyOwner {
        require(to_ != address(0), "BT: invalid receiver address");
        
        // If amount is 0, withdraw all tokens
        uint256 amount = amount_;
        if (amount == 0) {
            amount = IERC20(token_).balanceOf(address(this));
        }
        
        IERC20(token_).safeTransfer(to_, amount);
    }
    
    // Method to deposit rewards into the treasury
    function depositRewards(uint256 amount_) external {
        require(amount_ > 0, "BT: amount must be greater than 0");
        
        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), amount_);
    }
} 