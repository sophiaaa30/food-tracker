// 未啟用的擴充點：未來可在此串接 Open Food Facts 等食品資料來源。
// 回傳統一食物欄位：{ name, calories, protein, carbs, fat, fiber, portion }。
export async function searchFoods(_query) {
  throw new Error('食品搜尋將於後續版本提供，第一版不會發送網路請求。');
}
