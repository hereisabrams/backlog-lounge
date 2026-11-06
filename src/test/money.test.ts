import { describe, expect, it } from "vitest";
import { CURRENCIES, formatMoney, isCurrency } from "@/lib/games";

const normalize = (text: string) => text.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("defaults to dollars", () => {
    expect(formatMoney(59.99)).toBe("$59.99");
  });

  it("labels the amount in the account's currency without converting it", () => {
    expect(formatMoney(59.99, "EUR")).toBe("€59.99");
    expect(formatMoney(59.99, "GBP")).toBe("£59.99");
    expect(normalize(formatMoney(59.99, "BRL"))).toBe("R$ 59,99");
  });

  it("drops cents for yen", () => {
    expect(formatMoney(6980, "JPY")).toMatch(/^[￥¥]6,980$/);
  });

  it("formats every offered currency", () => {
    for (const { code } of CURRENCIES) expect(formatMoney(10, code)).toMatch(/10/);
  });
});

describe("isCurrency", () => {
  it("accepts only the offered currencies", () => {
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("eur")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});
