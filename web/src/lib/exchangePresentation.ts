import type { Exchange } from "../types";

export type ExchangeDirectionFilter = "ALL" | "OUTGOING" | "INCOMING";
export type ExchangeStatusFilter =
  | "ALL"
  | "REQUESTED"
  | "REJECTED"
  | "ACCEPTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export const exchangeStatusFilterOptions: Array<{ value: ExchangeStatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "REQUESTED", label: "Requested" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "DISPUTED", label: "Needs attention" },
];

export function exchangeDirection(exchange: Exchange, userId: string): "OUTGOING" | "INCOMING" {
  return exchange.claimantId === userId ? "OUTGOING" : "INCOMING";
}

function isContributorRejection(exchange: Exchange): boolean {
  if (exchange.status !== "CANCELLED") {
    return false;
  }
  return exchange.cancellationReason === "CONTRIBUTOR_REJECTED";
}

export function exchangeMatchesFilters(
  exchange: Exchange,
  userId: string,
  direction: ExchangeDirectionFilter,
  status: ExchangeStatusFilter,
): boolean {
  const role = exchangeDirection(exchange, userId);
  if (direction !== "ALL") {
    if (role !== direction) {
      return false;
    }
  }
  if (status === "ALL") {
    return true;
  }
  if (status === "REJECTED") {
    return isContributorRejection(exchange);
  }
  if (status === "CONFIRMED") {
    if (exchange.status !== "COMPLETED") {
      return false;
    }
    return role === "OUTGOING";
  }
  if (status === "COMPLETED") {
    if (exchange.status !== "COMPLETED") {
      return false;
    }
    return role === "INCOMING";
  }
  if (status === "CANCELLED") {
    if (exchange.status !== "CANCELLED") {
      return false;
    }
    return !isContributorRejection(exchange);
  }
  return exchange.status === status;
}

export function exchangeStatusLabel(exchange: Exchange, userId: string): string {
  if (isContributorRejection(exchange)) {
    return "Rejected";
  }
  if (exchange.status === "COMPLETED") {
    return exchange.claimantId === userId ? "Confirmed received" : "Completed";
  }
  if (exchange.status === "DISPUTED") {
    return "Needs attention";
  }
  return exchange.status.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export function coinMovementLabel(exchange: Exchange, userId: string): string {
  if (exchange.status === "REQUESTED") {
    return "1 coin reserved";
  }
  if (exchange.status === "ACCEPTED") {
    return "1 coin held until receipt";
  }
  if (exchange.status === "DISPUTED") {
    return "1 coin remains on hold";
  }
  if (exchange.status === "COMPLETED") {
    return exchange.contributorId === userId ? "+1 coin received" : "1 coin transferred";
  }
  return "1 coin returned";
}

export function exchangeHasContactAccess(exchange: Exchange): boolean {
  return ["ACCEPTED", "DISPUTED", "COMPLETED"].includes(exchange.status);
}
