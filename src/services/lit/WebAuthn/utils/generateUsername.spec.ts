import { expect, test, describe } from "bun:test";
import { generateTimestampBasedUsername } from "./generateUsername";

describe("generateTimestampBasedUsername", () => {
  test("should generate username with correct format", () => {
    const mockDate = new Date("2024-03-15T09:08:45.000Z");
    const originalDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
    } as DateConstructor;

    const username = generateTimestampBasedUsername();

    // Test exact match
    expect(username).toBe("Usernameless user (2024-03-15 09:08:45)");

    // Test format pattern
    const formatPattern =
      /^Usernameless user \(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\)$/;
    expect(formatPattern.test(username)).toBe(true);

    // Verify individual components
    const matches = username.match(
      /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/
    );
    expect(matches).not.toBeNull();
    if (matches) {
      const [_, year, month, day, hour, minute, second] = matches;
      expect(year).toBe("2024");
      expect(month).toBe("03");
      expect(day).toBe("15");
      expect(hour).toBe("09");
      expect(minute).toBe("08");
      expect(second).toBe("45");
    }

    // Clean up
    global.Date = originalDate;
  });

  test("should handle single digit values correctly", () => {
    const mockDate = new Date("2024-01-05T01:02:03.000Z");
    const originalDate = global.Date;
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
    } as DateConstructor;

    const username = generateTimestampBasedUsername();

    // Test exact match
    expect(username).toBe("Usernameless user (2024-01-05 01:02:03)");

    // Verify padding of single digits
    const matches = username.match(
      /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/
    );
    expect(matches).not.toBeNull();
    if (matches) {
      const [_, year, month, day, hour, minute, second] = matches;
      expect(month).toBe("01"); // Should be padded
      expect(day).toBe("05"); // Should be padded
      expect(hour).toBe("01"); // Should be padded
      expect(minute).toBe("02"); // Should be padded
      expect(second).toBe("03"); // Should be padded
    }

    // Clean up
    global.Date = originalDate;
  });
});
