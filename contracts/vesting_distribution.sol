// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVesting {
    function createVesting(
        address user,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 duration
    ) external;
}

import "@openzeppelin/contracts/access/AccessControl.sol";

contract VestingDistributor is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IVesting public vesting;

    constructor(address _vesting, address admin) {
        vesting = IVesting(_vesting);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function batchCreateVesting(
        address[] calldata users,
        uint256[] calldata amounts,
        uint64 start,
        uint64 cliff,
        uint64 duration
    ) external onlyRole(OPERATOR_ROLE) {
        require(users.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            vesting.createVesting(
                users[i],
                amounts[i],
                start,
                cliff,
                duration
            );
        }
    }
}