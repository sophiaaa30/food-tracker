// 未啟用的擴充點：此檔不會上傳圖片、也不包含 API Key。
// 未來優先考慮本機辨識方案；雲端辨識需額外後端保管金鑰並取得使用者同意。
export async function recogniseFoodPhoto(_imageBlob) {
  throw new Error('照片 AI 辨識尚未啟用。');
}
