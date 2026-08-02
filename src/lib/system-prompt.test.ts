import { describe, it, expect } from "vitest";
import { getCustomerServiceExpertise, getBusinessKnowledge, splitPrompt } from "./system-prompt";

describe("system-prompt separation", () => {
  it("returns customer service expertise string", () => {
    const expertise = getCustomerServiceExpertise();
    expect(typeof expertise).toBe("string");
    expect(expertise.length).toBeGreaterThan(0);
  });

  it("returns business knowledge string", () => {
    const knowledge = getBusinessKnowledge();
    expect(typeof knowledge).toBe("string");
  });

  it("splitPrompt returns both parts", () => {
    const combined = "EXPERTISE: sé amable\n## Datos de tu negocio\nKNOWLEDGE: vendemos cremas";
    const { expertise, knowledge } = splitPrompt(combined);
    expect(expertise).toContain("amable");
    expect(knowledge).toContain("cremas");
  });
});
