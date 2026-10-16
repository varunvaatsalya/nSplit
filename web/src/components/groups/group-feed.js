"use client";

import { UserAvatar } from "@/components/user-avatar";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { dateHeaderLabel, formatMinor, formatRowTime, memberName, parseDate } from "@/lib/format";
import { isSelfMember } from "@/lib/members";

function dayKey(date) {
  if (!date) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Feed items (expenses and transfers together), newest first, as in the app. */
export function buildFeed(expenses = [], transfers = []) {
  return [
    ...expenses.map((expense) => ({
      kind: "expense",
      id: expense._id,
      date: parseDate(expense.expenseDate || expense.createdAt),
      expense,
    })),
    ...transfers.map((transfer) => ({
      kind: "transfer",
      id: transfer._id,
      date: parseDate(transfer.transferDate || transfer.createdAt),
      transfer,
    })),
  ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

function groupByDay(items) {
  const map = new Map();
  for (const item of items) {
    const key = dayKey(item.date);
    if (!map.has(key)) map.set(key, { key, date: item.date, items: [] });
    map.get(key).items.push(item);
  }
  return [...map.values()];
}

function MemberInline({ member, currentUserId }) {
  return (
    <>
      <span className="font-bold">{memberName(member)}</span>
      {isSelfMember(member, currentUserId) ? <span className="font-bold"> (me)</span> : null}
    </>
  );
}

function FeedRow({ icon, title, amount, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-soft px-2.5 py-2.5 text-left transition-colors hover:bg-soft-hover"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-2xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-semibold leading-5">{title}</span>
        <span className="mt-0.5 block text-[11px] font-light leading-[15px] text-muted">{meta}</span>
      </span>
      <span className="shrink-0 pr-2 text-sm font-bold tabular-nums">{amount}</span>
    </button>
  );
}

export function GroupFeed({ items, group, currentUserId, onOpen }) {
  const members = group?.members || [];
  const byId = Object.fromEntries(members.map((m) => [m._id, m]));
  const currency = group?.currency || "INR";

  return (
    <div className="space-y-4.5">
      {groupByDay(items).map((section) => (
        <div key={section.key}>
          <h3 className="mb-2.5 px-1.5 text-sm font-bold tracking-[0.03em]">{dateHeaderLabel(section.date)}</h3>
          <div className="space-y-2.5">
            {section.items.map((item) => {
              if (item.kind === "transfer") {
                const t = item.transfer;
                return (
                  <FeedRow
                    key={`t-${t._id}`}
                    icon={t.icon || "💸"}
                    title={t.title || "Transfer"}
                    amount={formatMinor(t.amountMinor, t.currency || currency)}
                    onClick={() => onOpen(item)}
                    meta={
                      <>
                        <MemberInline member={byId[t.fromMemberId]} currentUserId={currentUserId} />
                        {" → "}
                        <MemberInline member={byId[t.toMemberId]} currentUserId={currentUserId} />
                        {" · "}
                        {formatRowTime(item.date)}
                      </>
                    }
                  />
                );
              }

              const e = item.expense;
              const payers = (e.payers || []).map((p) => byId[p.memberId]).filter(Boolean);
              return (
                <FeedRow
                  key={`e-${e._id}`}
                  icon={getExpenseEmoji(e.icon, e.categoryKey)}
                  title={e.title}
                  amount={formatMinor(e.amountMinor, e.currency || currency)}
                  onClick={() => onOpen(item)}
                  meta={
                    payers.length > 1 ? (
                      <span className="inline-flex items-center gap-1 align-middle">
                        Paid by
                        <span className="inline-flex -space-x-1">
                          {payers.slice(0, 3).map((m) => (
                            <UserAvatar
                              key={m._id}
                              className="h-4 w-4 ring-[1.5px] ring-soft"
                              fallbackClassName="text-[7px]"
                              name={memberName(m)}
                              avatar={m.avatar || m.user?.avatar}
                              seed={m.userId || m._id}
                            />
                          ))}
                        </span>
                        {payers.length > 3 ? `+${payers.length - 3}` : null}
                        {" · "}
                        {formatRowTime(item.date)}
                      </span>
                    ) : (
                      <>
                        Paid by <MemberInline member={payers[0]} currentUserId={currentUserId} />
                        {" · "}
                        {formatRowTime(item.date)}
                      </>
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
