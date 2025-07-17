/**
 * 相対時間を日本語で表示するユーティリティ関数
 * @param date 対象の日時
 * @returns 相対時間の文字列（例: "4分前", "2時間前", "1日前"）
 */
export const getRelativeTime = (date: Date | undefined): string => {
  // dateがundefinedまたはnullの場合のデフォルト値
  if (!date) {
    return "不明";
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // ミリ秒を各単位に変換
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) {
    return "たった今";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}週間前`;
  } else if (diffMonths < 12) {
    return `${diffMonths}ヶ月前`;
  } else {
    return `${diffYears}年前`;
  }
};

/**
 * 音声の長さを分:秒形式で表示する
 * @param seconds 秒数
 * @returns "MM:SS"形式の文字列
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}; 