import { describe, expect, it } from "vitest";
import { adaptiveThresholds, classify, median, riskScore, timeToCritical, trendLabel, weatherScore, BASE_THRESHOLDS } from "./riskEngine";

describe("riskEngine", () => {
  it("median takes index floor(n/2) of sorted", () => expect(median([5, 1, 90, 3, 4])).toBe(4));
  it("trend labels", () => {
    expect(trendLabel(0.5)).toBe("Stable");
    expect(trendLabel(3.5)).toBe("Rising");
    expect(trendLabel(-6)).toBe("Falling Rapidly");
  });
  it("weather score sums bands", () =>
    expect(weatherScore({ rainProb6h: 80, rainVolume6h: 10, rainVolume24h: 20, humidity: 85, clouds: 90 })).toBe(10));
  it("adaptive thresholds at score 6", () => expect(adaptiveThresholds(6).levelCritical).toBe(70));
  it("falling rate does not trigger", () => expect(classify(20, -10, BASE_THRESHOLDS, 0, false)).toBe("NORMAL"));
  it("rate >= critical is CRITICAL", () => expect(classify(20, 5, BASE_THRESHOLDS, 0, false)).toBe("CRITICAL"));
  it("rain prob 60 gives WATCH", () => expect(classify(10, 0, BASE_THRESHOLDS, 60, false)).toBe("WATCH"));
  it("float switch forces CRITICAL", () => expect(classify(10, 0, BASE_THRESHOLDS, 0, true)).toBe("CRITICAL"));
  it("score stays inside state band", () => expect(riskScore("WATCH", 100, 0, BASE_THRESHOLDS)).toBe(59));
  it("time to critical with rain factor", () => {
    const r = timeToCritical(53, 1, { rainProb6h: 80, rainVolume6h: 0, rainVolume24h: 0, humidity: 0, clouds: 0 });
    expect(r.minutes).toBeCloseTo(20);
  });
});
