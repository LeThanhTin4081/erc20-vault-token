// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Kế thừa các chuẩn ERC20 và chức năng bảo mật từ OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// Hợp đồng chính của dự án, tích hợp tính năng Đốt, Tạm dừng, Giới hạn trần và Phân quyền
contract VaultToken is ERC20, ERC20Burnable, ERC20Pausable, ERC20Capped, AccessControl {
    
    // Định nghĩa các vai trò quản trị trong mạng lưới
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); // Quyền in thêm token
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); // Quyền tạm dừng các giao dịch

    // Khởi tạo hợp đồng (chỉ chạy 1 lần khi deploy)
    constructor() 
        ERC20("VaultToken", "VLT")
        ERC20Capped(10_000_000 * 10 ** decimals()) // Cài đặt tổng cung tối đa: 10 triệu
    {
        // Cấp toàn quyền cho ví của người triển khai (msg.sender)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        // Tạo ra 1 triệu Token ban đầu (Initial Supply) cho ví Admin
        ERC20._mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // Hàm in thêm Token: Chỉ dành cho ví có quyền MINTER_ROLE
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // Hàm dừng giao dịch: Chỉ dành cho ví có quyền PAUSER_ROLE (dùng khi hệ thống lỗi/bị hack)
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    // Hàm mở lại giao dịch
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Ghi đè hàm _update bắt buộc để các tính năng mở rộng (Pausable, Capped) hoạt động trơn tru cùng nhau
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
