import { useEffect, useRef } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

interface Props {
  zoneId: string;
  onItemDropped: (draggedId: string, destId: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function DropZone({
  zoneId,
  onItemDropped,
  children,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    return dropTargetForElements({
      element: ref.current,
      onDrop: ({ source }) => {
        const id = source.data.libraryId as string;
        onItemDropped(id, zoneId);
      },
    });
  }, [zoneId, onItemDropped]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
