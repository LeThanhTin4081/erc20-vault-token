// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// /*
//     OpenZeppelin contracts
// */
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";

// contract MyToken is ERC20, AccessControl, ERC20Burnable, Pausable {
//     // =========================
//     // ROLES
//     // =========================
//     bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
//     bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

//     // =========================
//     // STATE
//     // =========================
//     uint256 public immutable maxSupply;

//     // =========================
//     // CONSTRUCTOR
//     // =========================
//     constructor(
//         uint256 _maxSupply,
//         address admin
//     ) ERC20("MyToken", "MTK") {
//         require(admin != address(0), "Invalid admin");

//         maxSupply = _maxSupply;

//         // setup roles
//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(MINTER_ROLE, admin);
//         _grantRole(PAUSER_ROLE, admin);
//     }

//     // =========================
//     // MINT
//     // =========================
//     function mint(address to, uint256 amount)
//         external
//         onlyRole(MINTER_ROLE)
//     {
//         require(totalSupply() + amount <= maxSupply, "Max supply exceeded");
//         _mint(to, amount);
//     }

//     // =========================
//     // PAUSE CONTROL
//     // =========================
//     function pause() external onlyRole(PAUSER_ROLE) {
//         _pause();
//     }

//     function unpause() external onlyRole(PAUSER_ROLE) {
//         _unpause();
//     }

//     // =========================
//     // HOOK (chặn transfer khi pause)
//     // =========================
//     function _update(
//         address from,
//         address to,
//         uint256 value
//     ) internal override whenNotPaused {
//         super._update(from, to, value);
//     }
// }