// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IFeeConfig
 * @dev Interface for fee configuration contract.
 */
interface IFeeConfig is IERC165 {
    /**
     * The event that is emitted when the base fee is set.
     * @param baseFee The base fee.
     */
    event BaseFeeSet(uint256 baseFee);

    /**
     * The event that is emitted when the fee is set.
     * @param sender The sender.
     * @param fee The fee.
     */
    event FeeSet(address indexed sender, uint256 fee);

    /**
     * The event that is emitted when the fee for operation is set.
     * @param sender The sender.
     * @param operation The operation.
     * @param fee The fee.
     */
    event FeeForOperationSet(address indexed sender, bytes32 indexed operation, uint256 fee);

    /**
     * The event that is emitted when the custom fee is discarded.
     * @param sender The sender.
     * @param operation The operation.
     */
    event CustomFeeDiscarded(address indexed sender, bytes32 indexed operation);

    /**
     * The event that is emitted when the treasury is set.
     * @param treasury The treasury address.
     */
    event TreasurySet(address indexed treasury);

    /**
     * The event that is emitted when the base fee is set.
     * @param operation The operation.
     * @param baseFeeForOperation The base fee for operation.
     */
    event BaseFeeForOperationSet(bytes32 operation, uint256 baseFeeForOperation);

    /**
     * The event that is emitted when a user is added.
     * @param user The user address.
     */
    event UserAdded(address indexed user);

    /**
     * The event that is emitted when a user is removed.
     * @param user The user address.
     */
    event UserRemoved(address indexed user);

    /**
     * The event that is emitted when an operation fee is set.
     * @param operation The operation.
     * @param fee The fee.
     * @param treasury The treasury address.
     */
    event OperationFeeSet(bytes32 indexed operation, uint256 fee, address treasury);

    /**
     * The event that is emitted when an operation fee is removed.
     * @param operation The operation.
     */
    event OperationFeeRemoved(bytes32 indexed operation);

    /**
     * Initializes the contract.
     *
     * @param treasury_ The treasury address.
     * @param baseFee_ The base fee.
     */
    function FeeConfig_init(address treasury_, uint256 baseFee_) external;

    /**
     * Sets the fee for the sender.
     *
     * @param sender_ The sender.
     * @param fee_ The fee.
     */
    function setFee(address sender_, uint256 fee_) external;

    /**
     * Sets the fee for the sender and operation.
     *
     * @param sender_ The sender.
     * @param operation_ The operation.
     * @param fee_ The fee.
     */
    function setFeeForOperation(address sender_, bytes32 operation_, uint256 fee_) external;

    /**
     * Discards the custom fee for the sender and operation.
     *
     * @param sender_ The sender.
     * @param operation_ The operation.
     */
    function discardCustomFee(address sender_, bytes32 operation_) external;

    /**
     * Sets the base fee for operation.
     *
     * @param operation_ The operation.
     * @param baseFeeForOperation_ The base fee for operation.
     */
    function setBaseFeeForOperation(bytes32 operation_, uint256 baseFeeForOperation_) external;

    /**
     * Sets the treasury address.
     *
     * @param treasury_ The treasury address.
     */
    function setTreasury(address treasury_) external;

    /**
     * Sets the base fee.
     *
     * @param baseFee_ The base fee.
     */
    function setBaseFee(uint256 baseFee_) external;

    /**
     * Gets the fee and treasury address.
     *
     * @param sender_ The sender.
     * @return The fee.
     * @return The treasury address.
     */
    function getFeeAndTreasury(address sender_) external view returns (uint256, address);

    /**
     * Gets the fee and treasury address for the sender and operation.
     *
     * @param sender_ The sender.
     * @param operation_ The operation.
     * @return The fee.
     * @return The treasury address.
     */
    function getFeeAndTreasuryForOperation(
        address sender_,
        bytes32 operation_
    ) external view returns (uint256, address);

    /**
     * The function that returns the fee and treasury address for the user and operation.
     * @param user The user address.
     * @param operation The operation.
     * @return fee The fee.
     * @return treasury The treasury address.
     */
    function getUserFee(address user, bytes32 operation) external view returns (uint256 fee, address treasury);

    /**
     * The function that sets the fee for the operation.
     * @param operation The operation.
     * @param fee The fee.
     * @param treasury The treasury address.
     */
    function setOperationFee(bytes32 operation, uint256 fee, address treasury) external;

    /**
     * The function that removes the fee for the operation.
     * @param operation The operation.
     */
    function removeOperationFee(bytes32 operation) external;
}
