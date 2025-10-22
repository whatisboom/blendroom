import { describe, it, expect } from "vitest";
import { normalizeQueue } from "@/lib/utils/queue";
import type { QueueItem } from "@/types";

describe("normalizeQueue", () => {
  it("should update positions sequentially starting from 0", () => {
    const queue: QueueItem[] = [
      {
        track: { id: "track1", name: "Track 1" } as QueueItem["track"],
        position: 5,
        addedBy: "user1",
        addedAt: Date.now(),
        isStable: false,
      },
      {
        track: { id: "track2", name: "Track 2" } as QueueItem["track"],
        position: 10,
        addedBy: "user2",
        addedAt: Date.now(),
        isStable: true,
      },
      {
        track: { id: "track3", name: "Track 3" } as QueueItem["track"],
        position: 15,
        addedBy: "algorithm",
        addedAt: Date.now(),
        isStable: false,
      },
    ];

    const result = normalizeQueue(queue);

    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
    expect(result[2].position).toBe(2);
  });

  it("should mark first 3 items as stable", () => {
    const queue: QueueItem[] = Array.from({ length: 5 }, (_, i) => ({
      track: { id: `track${i}`, name: `Track ${i}` } as QueueItem["track"],
      position: i,
      addedBy: "algorithm",
      addedAt: Date.now(),
      isStable: false,
    }));

    const result = normalizeQueue(queue);

    expect(result[0].isStable).toBe(true);
    expect(result[1].isStable).toBe(true);
    expect(result[2].isStable).toBe(true);
    expect(result[3].isStable).toBe(false);
    expect(result[4].isStable).toBe(false);
  });

  it("should mark all items as stable if queue has 3 or fewer items", () => {
    const queue: QueueItem[] = Array.from({ length: 2 }, (_, i) => ({
      track: { id: `track${i}`, name: `Track ${i}` } as QueueItem["track"],
      position: i,
      addedBy: "algorithm",
      addedAt: Date.now(),
      isStable: false,
    }));

    const result = normalizeQueue(queue);

    expect(result[0].isStable).toBe(true);
    expect(result[1].isStable).toBe(true);
  });

  it("should preserve other queue item properties", () => {
    const now = Date.now();
    const queue: QueueItem[] = [
      {
        track: { id: "track1", name: "Track 1", uri: "spotify:track:1" } as QueueItem["track"],
        position: 5,
        addedBy: "user123",
        addedAt: now,
        isStable: false,
      },
    ];

    const result = normalizeQueue(queue);

    expect(result[0].track.id).toBe("track1");
    expect(result[0].track.name).toBe("Track 1");
    expect(result[0].addedBy).toBe("user123");
    expect(result[0].addedAt).toBe(now);
  });

  it("should return empty array for empty queue", () => {
    const result = normalizeQueue([]);
    expect(result).toEqual([]);
  });

  it("should not mutate the original queue", () => {
    const queue: QueueItem[] = [
      {
        track: { id: "track1", name: "Track 1" } as QueueItem["track"],
        position: 10,
        addedBy: "user1",
        addedAt: Date.now(),
        isStable: false,
      },
    ];

    const original = [...queue];
    normalizeQueue(queue);

    expect(queue).toEqual(original);
    expect(queue[0].position).toBe(10);
    expect(queue[0].isStable).toBe(false);
  });
});
