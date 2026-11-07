import { describe, it, expect } from "vitest";
import { extractIntake } from "./intake";
import { SCENARIO_3_TRANSCRIPT } from "@/lib/mock/mathew";

describe("extractIntake (mock mode) — Scenario 3", () => {
  it("fills at least 15 fields from the spoken narrative", async () => {
    const res = await extractIntake({
      transcript: SCENARIO_3_TRANSCRIPT,
      answers: {},
    });
    const filled = Object.keys(res.answers).filter((k) => {
      const v = res.answers[k as `q${number}`];
      return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
    });
    expect(filled.length).toBeGreaterThanOrEqual(15);
    expect(res.mock).toBe(true);
  });

  it("maps speech to exact option text", async () => {
    const res = await extractIntake({
      transcript: SCENARIO_3_TRANSCRIPT,
      answers: {},
    });
    expect(res.answers.q5).toBe("Main Site");
    expect(res.answers.q9).toBe("Staff/Volunteer");
    expect(res.answers.q14).toBe("Yes");
    expect(res.answers.q13).toBe("Less Serious");
    expect(res.answers.q31).toContain("First Aid");
  });

  it("does not overwrite an answer the user already set", async () => {
    const res = await extractIntake({
      transcript: SCENARIO_3_TRANSCRIPT,
      answers: { q5: "Bishop St" },
    });
    expect(res.answers.q5).toBe("Bishop St");
  });

  it("asks only for a missing required field as the follow-up", async () => {
    const res = await extractIntake({
      transcript: SCENARIO_3_TRANSCRIPT,
      answers: {},
    });
    // q10 (phone) and q11 (name) are required and not in the narrative.
    if (res.followUp) {
      expect(res.missingRequired).toContain(res.followUp.questionId);
    }
  });
});
