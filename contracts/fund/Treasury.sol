// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Treasury
 * @dev Két tiền quản lý rủi ro tốt nhất. Chứa 20% token cộng đồng.
 * Cung cấp API để `approve` cho các hợp đồng phân phối quỹ chứ logic không nằm ở đây.
 */
contract Treasury {
    
    constructor() {
        // Liên kết AccessManager (chỉ Admin mới được điều khiển)
    }

    /**
     * @dev Nạp token vào két
     */
    function deposit() external payable {
        // Nhận native coin hoặc ERC20 token
    }

    /**
     * @dev Rút quỹ trực tiếp (chỉ Admin, hoặc multi-sig)
     */
    function withdraw(address to, uint256 amount) external {
        // Skeleton code
    }

    /**
     * @dev Uỷ quyền (approve) cho contract Distributor được rút tối đa amount token
     */
    function approveSpender(address token, address spender, uint256 amount) external {
        // Ngăn chặn race condition bằng cách reset về 0 trước nếu cần
        // Gọi chuẩn ERC20 approve()
    }
}
