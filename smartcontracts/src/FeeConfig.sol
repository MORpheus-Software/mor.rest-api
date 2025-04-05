// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IFeeConfig} from "./interfaces/IFeeConfig.sol";
import {PRECISION} from "@solarity/solidity-lib/utils/Globals.sol";

contract FeeConfig is IFeeConfig, UUPSUpgradeable, OwnableUpgradeable {
    // Treasury address
    address public treasury;
    
    // Base fee for all operations (in basis points)
    uint256 public baseFee;
    
    // Operation-specific base fees
    mapping(bytes32 => uint256) public baseFeeForOperation;
    
    // Custom fees for specific users
    mapping(address => uint256) public customFee;
    
    // Custom fees for specific users and operations
    mapping(address => mapping(bytes32 => uint256)) public customFeeForOperation;
    
    // New operation fees for simplified interface
    mapping(bytes32 => uint256) public operationFees;
    mapping(bytes32 => address) public operationTreasuries;

    /// @custom:oz-upgrades-unsafe-allow constructor
    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function FeeConfig_init(address treasury_, uint256 baseFee_) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        
        treasury = treasury_;
        baseFee = baseFee_;
        
        emit TreasurySet(treasury_);
        emit BaseFeeSet(baseFee_);
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IFeeConfig).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
    
    function setFee(address sender_, uint256 fee_) external onlyOwner {
        customFee[sender_] = fee_;
        emit FeeSet(sender_, fee_);
    }
    
    function setFeeForOperation(address sender_, bytes32 operation_, uint256 fee_) external onlyOwner {
        customFeeForOperation[sender_][operation_] = fee_;
        emit FeeForOperationSet(sender_, operation_, fee_);
    }
    
    function discardCustomFee(address sender_, bytes32 operation_) external onlyOwner {
        delete customFeeForOperation[sender_][operation_];
        emit CustomFeeDiscarded(sender_, operation_);
    }
    
    function setBaseFeeForOperation(bytes32 operation_, uint256 baseFeeForOperation_) external onlyOwner {
        baseFeeForOperation[operation_] = baseFeeForOperation_;
        emit BaseFeeForOperationSet(operation_, baseFeeForOperation_);
    }
    
    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }
    
    function setBaseFee(uint256 baseFee_) external onlyOwner {
        baseFee = baseFee_;
        emit BaseFeeSet(baseFee_);
    }
    
    function getFeeAndTreasury(address sender_) external view returns (uint256, address) {
        uint256 fee = customFee[sender_];
        if (fee == 0) {
            fee = baseFee;
        }
        return (fee, treasury);
    }
    
    function getFeeAndTreasuryForOperation(
        address sender_,
        bytes32 operation_
    ) external view returns (uint256, address) {
        // Try to get custom fee for this operation
        uint256 fee = customFeeForOperation[sender_][operation_];
        
        // If no custom fee, try operation-specific base fee
        if (fee == 0) {
            fee = baseFeeForOperation[operation_];
        }
        
        // If no operation-specific fee, try user's general custom fee
        if (fee == 0) {
            fee = customFee[sender_];
        }
        
        // If still no fee, use the base fee
        if (fee == 0) {
            fee = baseFee;
        }
        
        // Check for operation-specific treasury
        address treasuryToUse = operationTreasuries[operation_];
        if (treasuryToUse == address(0)) {
            treasuryToUse = treasury;
        }
        
        return (fee, treasuryToUse);
    }
    
    // New simplified interface methods
    function getUserFee(address user, bytes32 operation) external view returns (uint256 fee, address treasuryAddress) {
        // Use the same logic as getFeeAndTreasuryForOperation
        return this.getFeeAndTreasuryForOperation(user, operation);
    }
    
    function setOperationFee(bytes32 operation, uint256 fee, address treasuryAddress) external onlyOwner {
        operationFees[operation] = fee;
        operationTreasuries[operation] = treasuryAddress;
        emit OperationFeeSet(operation, fee, treasuryAddress);
    }
    
    function removeOperationFee(bytes32 operation) external onlyOwner {
        delete operationFees[operation];
        delete operationTreasuries[operation];
        emit OperationFeeRemoved(operation);
    }
} 