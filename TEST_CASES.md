# Test cases bổ sung

Các test này được tạo theo các invariant trong `README.md`, `ke_hoach_token_erc20.md`,
`kientruchethong.md` và `tong_ket_7_contract.md`.

## Lệnh chạy

```bash
npm test
```

Chạy riêng từng nhóm:

```bash
npx hardhat test test/StakingVault.test.ts
npx hardhat test test/LaunchTokenSecurity.test.ts
npx hardhat test test/SystemInvariants.test.ts
```

## Nhóm test mới/chỉnh trong thư mục `test`

| File | Mục tiêu kiểm thử |
| --- | --- |
| `StakingVault.test.ts` | Stake/unstake/reward/emergency withdraw bằng contract thật `LaunchToken`, `AirdropPoints`, `AccessManager`. |
| `LaunchTokenSecurity.test.ts` | Burn rate, auto-burn, pause/unpause và quyền admin. |
| `SystemInvariants.test.ts` | Luồng end-to-end 7 contract, launch gating, snapshot isolation, double claim, treasury safety. |

## Kịch bản chính

1. Trước launch, user không được transfer, stake hoặc lock.
2. User stake token, claim reward thành điểm, Treasury cấp quỹ và Distributor trả airdrop đúng điểm.
3. Snapshot mới không làm thay đổi điểm của snapshot cũ.
4. User chỉ claim một lần trên mỗi snapshot, nhưng được claim ở snapshot khác.
5. Emergency withdraw trả vốn, reset reward và không cộng điểm airdrop.
6. Treasury chặn amount bằng 0 và địa chỉ zero.
7. LaunchToken chỉ cho admin set burn rate, giới hạn burn rate tối đa 10%.
8. Auto-burn làm giảm số token người nhận và giảm total supply.
9. Pause chặn transfer của user nhưng admin vẫn xử lý được tình huống khẩn cấp.
