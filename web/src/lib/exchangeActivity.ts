import type { ExchangeStatus } from "../types";

export type ExchangeActivityRole = "contributor" | "claimant";

export const actionableExchangeStatus: Record<ExchangeActivityRole, ExchangeStatus> = {
  contributor: "REQUESTED",
  claimant: "ACCEPTED",
};

export function isActionableExchange(status: ExchangeStatus, role: ExchangeActivityRole): boolean {
  return status === actionableExchangeStatus[role];
}

export function exchangeActivityLabel(count: number): string {
  if (count === 1) {
    return "1 exchange needs your action";
  }

  return `${count} exchanges need your action`;
}
