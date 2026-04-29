import {
  Activity,
  Coins,
  Info,
  Layers3,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Panel } from "./ui";
import { TokenUnit, TokenValue } from "./token-display";

export function AboutContent() {
  return (
    <div className="flex flex-col gap-6 pb-20">
      <section className="relative z-10 py-12">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-300/[0.07] px-4 py-2 text-sm text-violet-100 ring-1 ring-violet-300/10">
            <Info aria-hidden className="h-4 w-4" />
            Đề tài nhóm
          </span>
          <h1 className="mt-6 text-4xl font-black text-white sm:text-5xl">
            VaultToken ERC-20 DeFi Ecosystem
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            Dự án thiết kế và triển khai hệ thống Token ERC-20 trên Ethereum
            Sepolia, kết hợp staking, airdrop theo snapshot, khóa token theo
            thời gian, Treasury và quản trị phân quyền bằng RBAC.
          </p>
        </div>
      </section>

      <Panel title="Thành Viên Nhóm" eyebrow="Team" icon={Users}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["NAM", "Leader / AccessManager / LaunchToken"],
            ["TIN", "Treasury / TokenLocker"],
            ["HẬU", "StakingVault / kiến trúc hệ thống"],
            ["VINH", "AirdropPoints / snapshot flow"],
            ["TRÌNH", "AirdropDistributor / testing & deploy"],
          ].map(([name, role]) => (
            <div className="rounded-xl bg-white/[0.035] p-4" key={name}>
              <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-violet-300/[0.045] text-xs text-slate-500 ring-1 ring-violet-300/10">
                Ảnh thành viên
              </div>
              <p className="font-semibold text-white">{name}</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{role}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Tổng Quan Dự Án" eyebrow="VaultToken" icon={Info}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-sm leading-7 text-slate-300">
            <p>
              VaultToken là hệ thống Token ERC-20 kết hợp các chức năng DeFi
              cốt lõi: staking, tích điểm on-chain, airdrop theo snapshot,
              khóa token theo thời gian và quản lý quỹ bằng Treasury.
            </p>
            <p>
              Kiến trúc được thiết kế theo hướng modular. Mỗi contract chỉ đảm
              nhận một trách nhiệm rõ ràng: token, quyền, staking, điểm, khóa
              token, quỹ và phân phối. Cách chia này giúp giảm coupling và làm
              cho test case, audit bảo mật rõ ràng hơn.
            </p>
            <p>
              Admin chuẩn bị hệ thống bằng cách mint token, mở trading, nạp quỹ
              vào Treasury, cấp allowance cho Distributor và tạo snapshot. Người
              dùng sau khi hệ thống launch có thể stake, unlock, claim reward và
              claim airdrop theo điểm đã ghi nhận.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Network", value: "Ethereum Sepolia" },
              { label: "Token", value: <span className="inline-flex items-center gap-1.5">VaultToken <TokenUnit /></span> },
              { label: "Decimals", value: "18" },
              { label: "Contracts", value: "7 modules" },
              { label: "Initial Supply", value: <TokenValue value="1,000,000" /> },
              { label: "Max Supply", value: <TokenValue value="10,000,000" /> },
              { label: "Stack", value: "Solidity, Hardhat, OpenZeppelin" },
              { label: "Frontend", value: "Next.js, Viem, Wagmi, MetaMask" },
            ].map((item) => (
              <div className="rounded-xl bg-violet-300/[0.055] px-4 py-3" key={item.label}>
                <p className="text-xs uppercase text-slate-500">{item.label}</p>
                <p className="mt-1 font-semibold text-violet-100">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Role Và Quyền Hạn" eyebrow="AccessManager RBAC" icon={ShieldCheck}>
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            ["ADMIN_ROLE", "Quyền cao nhất", "grantRole, revokeRole, openTrading, snapshot, withdraw Treasury, approveSpender cho Distributor."],
            ["MINTER_ROLE", "Quyền phát hành token", "Gọi mint(address, amount) trên LaunchToken, bị giới hạn bởi max supply/cap."],
            ["VAULT_ROLE", "Quyền hệ thống đặc biệt", "Cho phép StakingVault gọi addPoints trên AirdropPoints để ghi điểm cho user."],
            ["USER", "Người dùng phổ thông", "transfer, approve, burn, stake, unstake, lock, unlock, claim reward và claim airdrop."],
          ].map(([role, title, detail]) => (
            <div className="rounded-xl bg-white/[0.035] p-5" key={role}>
              <p className="text-xs font-semibold uppercase text-violet-200">{role}</p>
              <h3 className="mt-2 font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl bg-white/[0.035] p-5">
          <p className="text-sm font-semibold text-white">Sơ đồ phân quyền</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="rounded-xl bg-violet-300/[0.08] p-4 text-center text-sm font-semibold text-violet-100">ADMIN_ROLE</div>
            <div className="hidden text-slate-500 md:block">→</div>
            <div className="rounded-xl bg-black/20 p-4 text-center text-sm text-slate-200">grantRole / revokeRole</div>
            <div className="hidden text-slate-500 md:block">→</div>
            <div className="rounded-xl bg-violet-300/[0.08] p-4 text-center text-sm font-semibold text-violet-100">MINTER_ROLE / VAULT_ROLE</div>
          </div>
        </div>
      </Panel>

      <Panel title="Sơ Đồ Kiến Trúc Contract" eyebrow="Diagram from docs" icon={Layers3}>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {[
              ["Core", "AccessManager + LaunchToken", "Nền tảng quyền và token ERC-20 chính."],
              ["Feature", "TokenLocker + StakingVault + AirdropPoints", "Các chức năng người dùng: lock, stake, điểm snapshot."],
              ["Fund", "Treasury", "Két token, chỉ giữ tài sản và cấp allowance."],
              ["Distribution", "AirdropDistributor", "Phân phối token dựa trên điểm snapshot."],
            ].map(([layer, modules, detail]) => (
              <div className="rounded-xl bg-black/20 p-4" key={layer}>
                <p className="text-xs font-semibold uppercase text-violet-200">{layer}</p>
                <p className="mt-1 font-semibold text-white">{modules}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-violet-300/[0.035] p-5">
            <div className="grid gap-3 text-sm">
              <div className="rounded-xl bg-black/25 p-3 text-center text-white">AccessManager</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-black/20 p-3 text-center text-slate-200">LaunchToken</div>
                <div className="rounded-xl bg-black/20 p-3 text-center text-slate-200">Treasury</div>
                <div className="rounded-xl bg-black/20 p-3 text-center text-slate-200">AirdropPoints</div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-black/15 p-3 text-center text-slate-300">TokenLocker</div>
                <div className="rounded-xl bg-black/15 p-3 text-center text-slate-300">StakingVault</div>
                <div className="rounded-xl bg-black/15 p-3 text-center text-slate-300">AirdropDistributor</div>
              </div>
              <p className="text-center text-xs leading-5 text-slate-500">
                AccessManager kiểm tra role. LaunchToken là tài sản trung tâm.
                StakingVault ghi điểm vào AirdropPoints. Distributor rút token
                từ Treasury qua allowance.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Chi Tiết 7 Smart Contract" eyebrow="Contract responsibilities" icon={Layers3}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["AccessManager", "Quản lý role toàn hệ thống bằng RBAC. Admin cấp hoặc thu hồi role, các contract khác gọi hasRole để kiểm tra quyền trước khi chạy hành động đặc quyền."],
            ["LaunchToken", "Token ERC-20 chính của hệ thống. Kiểm soát openTrading, mint theo MINTER_ROLE, burn bởi user, transfer sau launch và burnRate."],
            ["TokenLocker", "Khóa token theo thời gian. Mỗi user có thể có nhiều lock, chỉ unlock được khi hết hạn."],
            ["StakingVault", "Nhận token stake, cập nhật reward, hỗ trợ unstake, claimRewards, emergencyWithdraw và cộng điểm."],
            ["AirdropPoints", "Không giữ token, chỉ accounting điểm. snapshotId chốt điểm từng epoch."],
            ["Treasury", "Quản lý quỹ token. Admin deposit, withdraw và approveSpender cho Distributor."],
            ["AirdropDistributor", "Claim gateway. Đọc điểm snapshot, kiểm tra claimed, tính reward và transferFrom từ Treasury."],
          ].map(([name, detail]) => (
            <div className="rounded-xl bg-white/[0.035] p-5" key={name}>
              <p className="font-semibold text-white">{name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Luồng User" eyebrow="Activity flow" icon={Activity}>
        <div className="grid gap-3 md:grid-cols-4">
          {["Start", "System launched?", "Choose action", "End"].map((step) => (
            <div className="rounded-xl bg-violet-300/[0.055] p-4 text-center text-sm font-semibold text-violet-100" key={step}>{step}</div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Stake", "Stake token → transfer vào Vault → update reward → add points → kết thúc."],
            ["Unstake", "Unstake token → transfer về user → update reward → kết thúc."],
            ["Claim reward", "Claim reward → transfer reward về user."],
            ["Claim airdrop", "Call claim → đọc snapshot + points → kiểm tra claimed → tính reward → kiểm tra Treasury → transfer token → mark claimed."],
            ["Lock / Unlock", "Lock token lưu thông tin khóa. Unlock kiểm tra thời gian, nếu chưa tới hạn thì revert, nếu đủ hạn thì trả token."],
            ["Emergency withdraw", "Rút vốn khẩn cấp khỏi StakingVault, reset reward về 0 và chỉ trả lại vốn gốc."],
          ].map(([name, detail]) => (
            <div className="rounded-xl bg-black/20 p-5" key={name}>
              <p className="font-semibold text-white">{name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Luồng Admin Và Thứ Tự Deploy" eyebrow="Operations" icon={UserCog}>
        <div className="grid gap-5 lg:grid-cols-2">
          {[
            ["Admin Flow", ["Mint token", "Open trading", "Trigger snapshot", "Deposit Treasury", "Approve Distributor", "Withdraw fund khi cần"]],
            ["Deploy Order", ["AccessManager", "LaunchToken", "TokenLocker / StakingVault / AirdropPoints / Treasury", "AirdropDistributor", "Grant roles: VAULT_ROLE, MINTER_ROLE"]],
          ].map(([title, steps]) => (
            <div className="rounded-xl bg-black/20 p-5" key={title as string}>
              <h3 className="font-semibold text-white">{title as string}</h3>
              <div className="mt-4 space-y-3">
                {(steps as string[]).map((step, index) => (
                  <div className="flex items-center gap-3 rounded-lg bg-white/[0.035] p-3" key={step}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-950 text-xs font-semibold text-violet-100">{index + 1}</span>
                    <span className="text-sm text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Tokenomics Và Phân Bổ" eyebrow="Supply model" icon={Coins}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Team/Dev", "30%", "300,000", "Khóa 180 ngày"],
            ["Public Sale", "20%", "200,000", "Không khóa"],
            ["Seed / Series A", "20%", "200,000", "Theo thỏa thuận"],
            ["Community", "20%", "200,000", "Airdrop + staking"],
            ["Reserve", "10%", "100,000", "Dự phòng"],
          ].map(([name, percent, amount, detail]) => (
            <div className="rounded-xl bg-black/20 p-5" key={name}>
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="mt-2 text-2xl font-bold text-violet-100">{percent}</p>
              <p className="mt-2 text-sm text-slate-300"><TokenValue value={amount} /></p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Bảo Mật, Ràng Buộc Và Rủi Ro" eyebrow="Invariants & mitigation" icon={ShieldCheck}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 font-semibold text-white">Invariants</h3>
            <div className="grid gap-3">
              {[
                "Một user chỉ được claim một lần trên mỗi snapshot.",
                "Tổng reward claim không được vượt quá số dư Treasury.",
                "Không được stake, lock hoặc transfer trước khi launch.",
                "Emergency withdraw phải reset trạng thái reward.",
                "Allowance phải được quản lý an toàn để tránh race condition.",
                "Snapshot isolation: mỗi đợt airdrop độc lập theo snapshotId.",
              ].map((item) => (
                <div className="rounded-xl bg-violet-300/[0.045] p-4 text-sm leading-6 text-slate-300" key={item}>{item}</div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-white">Risks & Mitigation</h3>
            <div className="grid gap-3">
              {[
                ["Double claim", "Dùng mapping claimed[snapshotId][user]."],
                ["Thiếu thanh khoản Treasury", "Kiểm tra balance trước khi transfer."],
                ["Approve race condition", "Reset allowance hoặc dùng tăng allowance có kiểm soát."],
                ["Reentrancy", "Dùng ReentrancyGuard cho StakingVault và AirdropDistributor."],
                ["Admin abuse", "Khuyến nghị multisig hoặc timelock khi production."],
              ].map(([risk, fix]) => (
                <div className="rounded-xl bg-black/20 p-4" key={risk}>
                  <p className="text-sm font-semibold text-white">{risk}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{fix}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
