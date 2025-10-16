"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface QueueTrack {
  track: {
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    duration_ms: number;
  };
  position: number;
  addedBy: string;
  addedAt: number;
  isStable: boolean;
}

interface SortableQueueListProps {
  queue: QueueTrack[];
  sessionId: string;
  isDJ: boolean;
  onPlayFromQueue?: (position: number) => void;
  onReorderComplete?: () => void;
}

function SortableQueueItem({
  item,
  index,
  isDJ,
  isStable,
  onClick,
}: {
  item: QueueTrack;
  index: number;
  isDJ: boolean;
  isStable: boolean;
  onClick?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${item.track.id}-${item.position}`,
    disabled: !isDJ || isStable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isStable
          ? "bg-green-900/20 border border-green-700/30"
          : "bg-gray-800"
      } ${
        isDJ && !isStable
          ? "cursor-grab active:cursor-grabbing hover:bg-gray-700"
          : "cursor-default"
      }`}
    >
      {/* Drag handle (DJ only, not for stable tracks) */}
      {isDJ && !isStable && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white transition-colors"
        >
          <GripVertical size={20} />
        </div>
      )}

      {/* Position */}
      <div className="text-sm text-gray-400 w-6 text-center">
        {index + 1}
      </div>

      {/* Album art */}
      {item.track.album.images[0] && (
        <img
          src={item.track.album.images[0].url}
          alt={item.track.album.name}
          className="w-12 h-12 rounded"
        />
      )}

      {/* Track info - make clickable for play-from-queue */}
      <div
        onClick={onClick}
        className={`flex-1 min-w-0 ${
          isDJ && onClick ? "cursor-pointer hover:text-green-400" : ""
        }`}
      >
        <div className="font-medium truncate">{item.track.name}</div>
        <div className="text-sm text-gray-400 truncate">
          {item.track.artists.map((a) => a.name).join(", ")}
        </div>
      </div>

      {/* Duration */}
      <div className="text-sm text-gray-400">
        {Math.floor(item.track.duration_ms / 60000)}:
        {String(Math.floor((item.track.duration_ms % 60000) / 1000)).padStart(
          2,
          "0"
        )}
      </div>

      {/* Stable indicator */}
      {isStable && (
        <div className="text-xs text-green-400 font-medium">Stable</div>
      )}
    </div>
  );
}

export function SortableQueueList({
  queue,
  sessionId,
  isDJ,
  onPlayFromQueue,
  onReorderComplete,
}: SortableQueueListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localQueue, setLocalQueue] = useState(queue);

  // Update local queue when prop changes (WebSocket updates)
  if (queue !== localQueue && !activeId) {
    setLocalQueue(queue);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localQueue.findIndex(
      (item) => `${item.track.id}-${item.position}` === active.id
    );
    const newIndex = localQueue.findIndex(
      (item) => `${item.track.id}-${item.position}` === over.id
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Don't allow moving stable tracks or moving tracks into stable zone
    const isMovingStableTrack = localQueue[oldIndex].isStable;
    const isMovingToStableZone = newIndex < 3;

    if (isMovingStableTrack || isMovingToStableZone) {
      console.log("Cannot move stable tracks or move tracks into stable zone");
      return;
    }

    // Optimistically update local state
    const newQueue = arrayMove(localQueue, oldIndex, newIndex);
    setLocalQueue(newQueue);

    // Call API to persist the reorder
    try {
      const response = await fetch(`/api/queue/${sessionId}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPosition: oldIndex,
          toPosition: newIndex,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reorder queue");
      }

      // Notify parent component
      if (onReorderComplete) {
        onReorderComplete();
      }
    } catch (err) {
      console.error("Failed to reorder queue:", err);
      // Revert optimistic update on error
      setLocalQueue(queue);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Create list of IDs for sortable context
  const itemIds = localQueue.map((item) => `${item.track.id}-${item.position}`);

  // Find the active item for drag overlay
  const activeItem = activeId
    ? localQueue.find((item) => `${item.track.id}-${item.position}` === activeId)
    : null;
  const activeIndex = activeItem
    ? localQueue.findIndex((item) => `${item.track.id}-${item.position}` === activeId)
    : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {localQueue.map((item, index) => (
            <SortableQueueItem
              key={`${item.track.id}-${item.position}`}
              item={item}
              index={index}
              isDJ={isDJ}
              isStable={item.isStable}
              onClick={
                onPlayFromQueue ? () => onPlayFromQueue(index) : undefined
              }
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - shows the dragged item following cursor */}
      <DragOverlay>
        {activeItem ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-700 shadow-2xl border border-green-500/50">
            {/* Drag handle */}
            <div className="text-white">
              <GripVertical size={20} />
            </div>

            {/* Position */}
            <div className="text-sm text-gray-400 w-6 text-center">
              {activeIndex + 1}
            </div>

            {/* Album art */}
            {activeItem.track.album.images[0] && (
              <img
                src={activeItem.track.album.images[0].url}
                alt={activeItem.track.album.name}
                className="w-12 h-12 rounded"
              />
            )}

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-white">
                {activeItem.track.name}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {activeItem.track.artists.map((a) => a.name).join(", ")}
              </div>
            </div>

            {/* Duration */}
            <div className="text-sm text-gray-400">
              {Math.floor(activeItem.track.duration_ms / 60000)}:
              {String(
                Math.floor((activeItem.track.duration_ms % 60000) / 1000)
              ).padStart(2, "0")}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
