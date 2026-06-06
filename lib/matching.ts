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

  // 4名以下: 1グループ確定
  if (paired.length <= 4) {
    return [paired];
  }

  // 5名以上: 3名ずつ分割、余りは最後のグループに
  const groups: GroupMember[][] = [];
  let i = 0;
  while (i + 3 <= paired.length) {
    groups.push(paired.slice(i, i + 3));
    i += 3;
  }
  if (i < paired.length) {
    groups.push(paired.slice(i));
  }

  return groups;
}
