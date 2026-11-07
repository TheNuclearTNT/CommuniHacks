import { describe, it, expect } from "vitest";
import type { Answers } from "@/lib/types";
import { QUESTIONS, QUESTION_BY_ID } from "./questions";
import {
  isVisible,
  visibleQuestions,
  missingRequired,
  clearHidden,
  completeness,
  isEmpty,
} from "./logic";

describe("question config", () => {
  it("has all 35 questions q1..q35", () => {
    expect(QUESTIONS).toHaveLength(35);
    for (let i = 1; i <= 35; i++) {
      expect(QUESTION_BY_ID[`q${i}`]).toBeDefined();
    }
  });
});

describe("isEmpty", () => {
  it("treats null, empty string, whitespace and [] as empty", () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty("")).toBe(true);
    expect(isEmpty("   ")).toBe(true);
    expect(isEmpty([])).toBe(true);
  });
  it("treats real values as non-empty", () => {
    expect(isEmpty("Main Site")).toBe(false);
    expect(isEmpty(["Burn"])).toBe(false);
  });
});

describe("isVisible — every showIf rule from A2", () => {
  // Each entry: child id, the parent/value that reveals it.
  const rules: { child: string; parent: string; value: string }[] = [
    { child: "q6", parent: "q5", value: "Other (please specify below)" },
    { child: "q8", parent: "q7", value: "Other (please specify)" },
    { child: "q15", parent: "q14", value: "Yes" },
    { child: "q17", parent: "q16", value: "Yes" },
    { child: "q19", parent: "q18", value: "Yes" },
    { child: "q21", parent: "q20", value: "Yes" },
    { child: "q25", parent: "q23", value: "Yes" },
    { child: "q26", parent: "q25", value: "Police" },
    { child: "q27", parent: "q25", value: "Police" },
    { child: "q29", parent: "q28", value: "Yes" },
  ];

  it("hides each conditional question until its parent matches", () => {
    for (const { child, parent, value } of rules) {
      const q = QUESTION_BY_ID[child];
      // hidden with no parent answer
      expect(isVisible(q, {})).toBe(false);
      // hidden with a wrong parent answer
      expect(isVisible(q, { [parent]: "No" } as Answers)).toBe(false);
      // visible once parent matches
      expect(isVisible(q, { [parent]: value } as Answers)).toBe(true);
    }
  });

  it("always-shown questions have no showIf and are visible with no answers", () => {
    const alwaysShown = QUESTIONS.filter((q) => !q.showIf);
    for (const q of alwaysShown) {
      expect(isVisible(q, {})).toBe(true);
    }
  });

  it("matches a multi-select parent by array membership", () => {
    // Build a hypothetical child depending on a multi parent (q19 is multi).
    const child = {
      ...QUESTION_BY_ID["q6"],
      showIf: { q19: "Theft" },
    };
    expect(isVisible(child, { q19: ["Property Damage"] })).toBe(false);
    expect(isVisible(child, { q19: ["Property Damage", "Theft"] })).toBe(true);
  });
});

describe("visibleQuestions", () => {
  it("excludes conditional children until revealed", () => {
    const ids = visibleQuestions({}).map((q) => q.id);
    expect(ids).not.toContain("q6");
    expect(ids).not.toContain("q15");
    expect(ids).toContain("q1");
    expect(ids).toContain("q35");
  });

  it("includes a child once its parent is set", () => {
    const ids = visibleQuestions({ q14: "Yes" }).map((q) => q.id);
    expect(ids).toContain("q15");
  });
});

describe("missingRequired", () => {
  it("lists visible required empty questions and ignores optional/hidden ones", () => {
    const missing = missingRequired({});
    // q4 (optional) never listed
    expect(missing).not.toContain("q4");
    // q6 hidden until q5=Other, so not listed yet
    expect(missing).not.toContain("q6");
    // q1 required + empty -> listed
    expect(missing).toContain("q1");
    expect(missing).toContain("q35");
  });

  it("drops a question once it is answered", () => {
    const missing = missingRequired({ q1: "2026-11-07" });
    expect(missing).not.toContain("q1");
  });

  it("surfaces a newly-required child (q6) when q5=Other", () => {
    const answers: Answers = { q5: "Other (please specify below)" };
    expect(missingRequired(answers)).toContain("q6");
  });
});

describe("clearHidden", () => {
  it("drops a child answer when its parent no longer reveals it", () => {
    const answers: Answers = { q14: "Yes", q15: ["Burn"] };
    const cleared = clearHidden({ ...answers, q14: "No" });
    expect(cleared.q15).toBeUndefined();
    expect(cleared.q14).toBe("No");
  });

  it("keeps a child answer while its parent still reveals it", () => {
    const answers: Answers = { q14: "Yes", q15: ["Burn"] };
    const cleared = clearHidden(answers);
    expect(cleared.q15).toEqual(["Burn"]);
  });
});

describe("completeness", () => {
  it("counts answered over currently-visible questions", () => {
    const empty = completeness({});
    expect(empty.answered).toBe(0);
    expect(empty.total).toBeGreaterThan(0);

    const some = completeness({ q1: "2026-11-07", q3: "Riley Chen" });
    expect(some.answered).toBe(2);
  });
});
