import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../settings";

// Reset the store before each test
beforeEach(() => {
  useSettingsStore.setState({
    topics: [],
    geographies: [],
    lenses: [],
    showCitationBrackets: true,
  });
});

describe("settings store", () => {
  describe("initial state", () => {
    it("has empty topics", () => {
      expect(useSettingsStore.getState().topics).toEqual([]);
    });

    it("has empty geographies", () => {
      expect(useSettingsStore.getState().geographies).toEqual([]);
    });

    it("has citation brackets enabled", () => {
      expect(useSettingsStore.getState().showCitationBrackets).toBe(true);
    });
  });

  describe("addTopic / removeTopic", () => {
    it("adds a topic", () => {
      useSettingsStore.getState().addTopic("AI");
      expect(useSettingsStore.getState().topics).toEqual(["AI"]);
    });

    it("trims whitespace", () => {
      useSettingsStore.getState().addTopic("  AI  ");
      expect(useSettingsStore.getState().topics).toEqual(["AI"]);
    });

    it("ignores empty strings", () => {
      useSettingsStore.getState().addTopic("");
      useSettingsStore.getState().addTopic("   ");
      expect(useSettingsStore.getState().topics).toEqual([]);
    });

    it("does not add duplicates", () => {
      useSettingsStore.getState().addTopic("AI");
      useSettingsStore.getState().addTopic("AI");
      expect(useSettingsStore.getState().topics).toEqual(["AI"]);
    });

    it("removes a topic", () => {
      useSettingsStore.getState().addTopic("AI");
      useSettingsStore.getState().addTopic("Security");
      useSettingsStore.getState().removeTopic("AI");
      expect(useSettingsStore.getState().topics).toEqual(["Security"]);
    });
  });

  describe("addGeography / removeGeography", () => {
    it("adds a geography", () => {
      useSettingsStore.getState().addGeography("Norway");
      expect(useSettingsStore.getState().geographies).toEqual(["Norway"]);
    });

    it("trims whitespace", () => {
      useSettingsStore.getState().addGeography("  Norway  ");
      expect(useSettingsStore.getState().geographies).toEqual(["Norway"]);
    });

    it("ignores empty strings", () => {
      useSettingsStore.getState().addGeography("");
      expect(useSettingsStore.getState().geographies).toEqual([]);
    });

    it("does not add duplicates", () => {
      useSettingsStore.getState().addGeography("Norway");
      useSettingsStore.getState().addGeography("Norway");
      expect(useSettingsStore.getState().geographies).toEqual(["Norway"]);
    });

    it("removes a geography", () => {
      useSettingsStore.getState().addGeography("Norway");
      useSettingsStore.getState().addGeography("Sweden");
      useSettingsStore.getState().removeGeography("Norway");
      expect(useSettingsStore.getState().geographies).toEqual(["Sweden"]);
    });
  });

  describe("toggleCitationBrackets", () => {
    it("toggles from true to false", () => {
      useSettingsStore.getState().toggleCitationBrackets();
      expect(useSettingsStore.getState().showCitationBrackets).toBe(false);
    });

    it("toggles back to true", () => {
      useSettingsStore.getState().toggleCitationBrackets();
      useSettingsStore.getState().toggleCitationBrackets();
      expect(useSettingsStore.getState().showCitationBrackets).toBe(true);
    });
  });
});
