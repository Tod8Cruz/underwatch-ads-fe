interface Props {
  count: number;
  onClear: () => void;
  onRemove: () => void;
  onMove: (group: string) => void;
  groups: string[];
}

export default function FloatingToolbar({
  count,
  onClear,
  onRemove,
  onMove,
  groups,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t px-6 py-4 flex justify-between items-center z-50 shadow-md">
      <div>{count} selected</div>
      <div className="flex gap-4">
        <select
          onChange={(e) => {
            const group = e.target.value;
            if (group) {
              const confirmed = window.confirm(
                `Move ${count} ad(s) to ${group}?`
              );
              if (confirmed) onMove(group);
            }
          }}
          className="border rounded px-2 py-1"
        >
          <option value="">Move to group...</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button onClick={onRemove} className="text-red-600 hover:text-red-800">
          Remove from group
        </button>
        <button onClick={onClear} className="text-blue-600 hover:underline">
          Clear selection
        </button>
      </div>
    </div>
  );
}
