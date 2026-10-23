// User Online & Last Seen Presence Formatter according to user rules

export function formatUserPresenceStatus(
  isTyping: boolean,
  isOnline: boolean | undefined,
  lastSeenDate: Date | null | undefined
): { text: string; isOnline: boolean; isTyping: boolean } {
  // 1. If currently typing
  if (isTyping) {
    return { text: 'печатает...', isOnline: true, isTyping: true };
  }

  const now = new Date();

  // If lastSeenDate is missing
  if (!lastSeenDate) {
    if (isOnline) {
      return { text: 'в сети', isOnline: true, isTyping: false };
    }
    return { text: 'был(а) недавно', isOnline: false, isTyping: false };
  }

  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // 2. If online right now (within 90 seconds or isOnline flag true)
  if (isOnline || diffMinutes < 2) {
    return { text: 'в сети', isOnline: true, isTyping: false };
  }

  // 3. If left recently (between 2 and 6 minutes ago)
  if (diffMinutes <= 6) {
    return { text: 'был(а) недавно', isOnline: false, isTyping: false };
  }

  // Helper format time HH:MM
  const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Dates comparison
  const isToday =
    now.getDate() === lastSeenDate.getDate() &&
    now.getMonth() === lastSeenDate.getMonth() &&
    now.getFullYear() === lastSeenDate.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === lastSeenDate.getDate() &&
    yesterday.getMonth() === lastSeenDate.getMonth() &&
    yesterday.getFullYear() === lastSeenDate.getFullYear();

  // 4. If left today
  if (isToday) {
    return { text: `был(а) в ${timeStr}`, isOnline: false, isTyping: false };
  }

  // 5. If left yesterday
  if (isYesterday) {
    return { text: `был(а) вчера в ${timeStr}`, isOnline: false, isTyping: false };
  }

  // 6. Day before yesterday or earlier: show full date DD.MM.YYYY at HH:MM
  const day = String(lastSeenDate.getDate()).padStart(2, '0');
  const month = String(lastSeenDate.getMonth() + 1).padStart(2, '0');
  const year = lastSeenDate.getFullYear();

  return {
    text: `был(а) ${day}.${month}.${year} в ${timeStr}`,
    isOnline: false,
    isTyping: false
  };
}
