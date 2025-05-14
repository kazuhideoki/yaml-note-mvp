import {
  summarizeContent,
  formatError,
  createPerformanceMarker,
} from "../logUtils";
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("logUtils", () => {
  describe("summarizeContent", () => {
    it("should summarize content correctly", () => {
      const content = `title: Test
content: |
  ## Heading
  Some test content
  - Item 1
  - Item 2
tags:
  - tag1
  - tag2`;

      const summary = JSON.parse(summarizeContent(content));

      expect(summary.lineCount).toBe(9);
      expect(summary.hasTitle).toBe(true);
      expect(summary.hasContent).toBe(true);
      expect(summary.hasTags).toBe(true);
      expect(summary.byteLength).toBeGreaterThan(0);
    });

    it("should handle empty content", () => {
      const content = "";
      const summary = JSON.parse(summarizeContent(content));

      expect(summary.lineCount).toBe(1);
      expect(summary.hasTitle).toBe(false);
      expect(summary.hasContent).toBe(false);
      expect(summary.byteLength).toBe(0);
    });
  });

  describe("formatError", () => {
    it("should format standard error objects", () => {
      const error = new Error("Test error");
      const formatted = formatError(error);

      expect(formatted.message).toBe("Test error");
      expect(formatted.name).toBe("Error");
    });

    it("should handle non-standard error objects", () => {
      const error = Error("Custom error");
      const formatted = formatError(error);

      expect(formatted.message).toBe("Custom error");
    });
  });

  describe("createPerformanceMarker", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should measure elapsed time", () => {
      const endMeasure = createPerformanceMarker("test_action");

      // 時間を進める（実際のテストでは不要だが、明示的に時間経過を表現）
      vi.advanceTimersByTime(50);

      const result = endMeasure();

      expect(result.action).toBe("test_action");
      expect(result.start).toBeLessThan(result.end);
      expect(result.duration).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
