type GroupMember = { id: string; nickname: string };

export function createGroups(
  participants: string[],
  nicknames: string[]
): GroupMember[][] | null {
  if (participants.length < 2) return null;

  const paired = participants.map((id, i) => ({ id, nickname: nicknames[i] }));

  // Fisher-Yates shuffle
  for (let i = paired.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paired[i], paired[j]] = [paired[j], paired[i]];
  }

  const groups: GroupMember[][] = [];
  let i = 0;
  while (i < paired.length) {
    const remaining = paired.length - i;
    // 余りが1になる場合は4名グループにする
    const size = remaining % 3 === 1 ? 4 : 3;
    groups.push(paired.slice(i, i + size));
    i += size;
  }

  return groups;
}
