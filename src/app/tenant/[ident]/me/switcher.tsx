"use client";

export function MemberSwitcher({
  members,
  currentId,
}: {
  members: { id: string; name: string }[];
  currentId: string;
}) {
  return (
    <select
      defaultValue={currentId}
      onChange={(e) => (window.location.href = `?as=${e.target.value}`)}
      className="bg-white border border-amber-300 rounded px-2 py-0.5 text-xs"
    >
      {members.map((m) => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  );
}
