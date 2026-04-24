// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Treasury is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IERC20 public immutable token;

    event Withdraw(address indexed to, uint256 amount);

    constructor(address _token, address admin) {
        require(_token != address(0), "Invalid token");

        token = IERC20(_token);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    // =========================
    // RÚT TOKEN RA NGOÀI
    // =========================
    function withdraw(address to, uint256 amount)
        external
        onlyRole(OPERATOR_ROLE)
    {
        require(to != address(0), "Invalid address");
        require(token.transfer(to, amount), "Transfer failed");

        emit Withdraw(to, amount);
    }

    // =========================
    // APPROVE CHO CONTRACT KHÁC (VD: VESTING)
    // =========================
    function approve(address spender, uint256 amount)
        external
        onlyRole(OPERATOR_ROLE)
    {
        token.approve(spender, amount);
    }
}