import type { QueueItem } from "@/types";

/**
 * Normalize queue item positions and stable flags after modifications
 * Sets first 3 items as stable, updates positions sequentially
 */
export function normalizeQueue(queue: QueueItem[]): QueueItem[] {
  return queue.map((item, index) => ({
    ...item,
    position: index,
    isStable: index < 3,
  }));
}
