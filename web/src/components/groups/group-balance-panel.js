"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function formatMinor(minor, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((minor || 0) / 100);
}

function toMajor(minor) {
  return Math.round((Number(minor) || 0) / 100);
}

const NET_CHART_CONFIG = {
  credit: { label: "To receive", color: "var(--success)" },
  debt: { label: "To pay", color: "var(--danger)" },
};

const FLOW_CHART_CONFIG = {
  paid: { label: "Paid", color: "var(--chart-2)" },
  owed: { label: "Share", color: "var(--chart-4)" },
  transferredOut: { label: "Sent", color: "var(--chart-3)" },
  transferredIn: { label: "Received", color: "var(--chart-1)" },
};

const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
];

export function GroupBalancePanel({ balance, currency = "INR" }) {
  const members = balance?.members || [];
  const categories = balance?.categories || [];
  const pairwise = balance?.pairwise || [];
  const summary = balance?.summary || {};

  const netData = useMemo(
    () =>
      [...members]
        .sort((a, b) => Math.abs(b.netMinor) - Math.abs(a.netMinor))
        .map((m) => ({
          name: m.displayName || "Member",
          credit: m.netMinor > 0 ? toMajor(m.netMinor) : 0,
          debt: m.netMinor < 0 ? toMajor(Math.abs(m.netMinor)) : 0,
          netMinor: m.netMinor,
        })),
    [members]
  );

  const flowData = useMemo(
    () =>
      members.map((m) => ({
        name: m.displayName || "Member",
        paid: toMajor(m.paidMinor),
        owed: toMajor(m.owedMinor),
        transferredOut: toMajor(m.transferredOutMinor),
        transferredIn: toMajor(m.transferredInMinor),
      })),
    [members]
  );

  const categoryData = useMemo(
    () =>
      categories.map((c, i) => ({
        key: c.key,
        name: c.label,
        emoji: c.emoji,
        amount: toMajor(c.amountMinor),
        amountMinor: c.amountMinor,
        count: c.count,
        fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })),
    [categories]
  );

  const categoryConfig = useMemo(() => {
    const cfg = {};
    for (const c of categoryData) {
      cfg[c.key] = { label: c.name, color: c.fill };
    }
    return cfg;
  }, [categoryData]);

  const maxAbsNet = Math.max(
    1,
    ...members.map((m) => Math.abs(m.netMinor || 0))
  );
  const maxCategory = Math.max(1, ...categories.map((c) => c.amountMinor || 0));

  if (!members.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted">
          No balance data yet. Add an expense to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-0">
            <CardDescription>Spent</CardDescription>
            <CardTitle className="text-base tabular-nums">
              {formatMinor(summary.totalExpenseMinor, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 text-[11px] text-muted">
            {summary.expenseCount || 0} expenses
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardDescription>Unsettled</CardDescription>
            <CardTitle className="text-base tabular-nums">
              {formatMinor(summary.unsettledMinor, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 text-[11px] text-muted">
            still open
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardDescription>To receive</CardDescription>
            <CardTitle className="text-base tabular-nums text-positive">
              {summary.creditors || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 text-[11px] text-muted">
            members
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardDescription>To pay</CardDescription>
            <CardTitle className="text-base tabular-nums text-owes">
              {summary.debtors || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 text-[11px] text-muted">
            members
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="net">
        <TabsList>
          <TabsTrigger value="net">Net</TabsTrigger>
          <TabsTrigger value="flow">Breakdown</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="settle">Settle up</TabsTrigger>
        </TabsList>

        <TabsContent value="net" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Net balance</CardTitle>
              <CardDescription>
                Who should receive money vs who still owes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={NET_CHART_CONFIG}
                className="aspect-[4/3] w-full sm:aspect-video"
              >
                <BarChart data={netData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={72}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatMinor(Number(value) * 100, currency)
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="credit"
                    stackId="net"
                    fill="var(--color-credit)"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="debt"
                    stackId="net"
                    fill="var(--color-debt)"
                    radius={[0, 4, 4, 0]}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Relative net position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...members]
                .sort((a, b) => b.netMinor - a.netMinor)
                .map((m) => {
                  const pct = Math.round(
                    (Math.abs(m.netMinor) / maxAbsNet) * 100
                  );
                  return (
                    <div key={m.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">
                          {m.displayName}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            m.netMinor > 0
                              ? "text-positive"
                              : m.netMinor < 0
                                ? "text-owes"
                                : "text-muted"
                          )}
                        >
                          {m.netMinor > 0 ? "+" : ""}
                          {formatMinor(m.netMinor, currency)}
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        indicatorClassName={
                          m.netMinor >= 0 ? "bg-[var(--success)]" : "bg-[var(--danger)]"
                        }
                      />
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Money flow</CardTitle>
              <CardDescription>
                Paid, share owed, transfers sent & received.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={FLOW_CHART_CONFIG}
                className="aspect-[4/3] w-full sm:aspect-video"
              >
                <BarChart data={flowData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatMinor(Number(value) * 100, currency)
                        }
                      />
                    }
                  />
                  <Bar dataKey="paid" fill="var(--color-paid)" radius={3} />
                  <Bar dataKey="owed" fill="var(--color-owed)" radius={3} />
                  <Bar
                    dataKey="transferredOut"
                    fill="var(--color-transferredOut)"
                    radius={3}
                  />
                  <Bar
                    dataKey="transferredIn"
                    fill="var(--color-transferredIn)"
                    radius={3}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id}>
                <CardContent className="grid grid-cols-2 gap-2 py-3 text-xs sm:grid-cols-4">
                  <div>
                    <div className="text-muted">Paid</div>
                    <div className="font-medium tabular-nums">
                      {formatMinor(m.paidMinor, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted">Share</div>
                    <div className="font-medium tabular-nums">
                      {formatMinor(m.owedMinor, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted">Sent</div>
                    <div className="font-medium tabular-nums">
                      {formatMinor(m.transferredOutMinor, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted">Received</div>
                    <div className="font-medium tabular-nums">
                      {formatMinor(m.transferredInMinor, currency)}
                    </div>
                  </div>
                  <div className="col-span-2 border-t border-border pt-2 sm:col-span-4">
                    <span className="font-medium">{m.displayName}</span>
                    <span
                      className={cn(
                        "ml-2 tabular-nums",
                        m.netMinor > 0
                          ? "text-positive"
                          : m.netMinor < 0
                            ? "text-owes"
                            : "text-muted"
                      )}
                    >
                      net {m.netMinor > 0 ? "+" : ""}
                      {formatMinor(m.netMinor, currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spend by category</CardTitle>
              <CardDescription>
                How group money is distributed across expense types.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length ? (
                <ChartContainer
                  config={categoryConfig}
                  className="mx-auto aspect-square max-h-[280px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="key"
                          formatter={(value) =>
                            formatMinor(Number(value) * 100, currency)
                          }
                        />
                      }
                    />
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="key"
                      innerRadius={55}
                      outerRadius={95}
                      strokeWidth={2}
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="key" />}
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="py-8 text-center text-sm text-muted">
                  No categorized expenses yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((c) => {
                const pct = Math.round((c.amountMinor / maxCategory) * 100);
                return (
                  <div key={c.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">
                        <span className="mr-1.5">{c.emoji}</span>
                        {c.label}
                        <span className="ml-1.5 text-xs text-muted">
                          · {c.count}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMinor(c.amountMinor, currency)}
                      </span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
              {!categories.length ? (
                <p className="text-sm text-muted">Nothing to show yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggested settlements</CardTitle>
              <CardDescription>
                Fewest transfers to clear everyone’s net balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pairwise.length ? (
                <ul className="space-y-2">
                  {pairwise.map((p, idx) => (
                    <li
                      key={`${p.from}-${p.to}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{p.fromName}</span>
                        <span className="text-muted"> → </span>
                        <span className="font-medium">{p.toName}</span>
                      </div>
                      <div className="shrink-0 font-semibold tabular-nums">
                        {formatMinor(p.amountMinor, currency)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted">
                  All settled - nothing to transfer.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
