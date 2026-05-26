① ユーザーがLINEでレシート画像を送信
↓
② LINEサーバーがWebhookを呼び出す
↓
③ Vercel上のNext.js API(route.ts)が受信
↓
④ route.tsがLINE APIから画像本体を取得
↓
⑤ route.tsがGemini APIへ画像を送信
↓
⑥ Geminiがレシート内容を解析
↓
⑦ JSON形式で結果を返す
↓
⑧ route.tsが結果を受け取る
↓
⑨ Google Sheetsへ保存
