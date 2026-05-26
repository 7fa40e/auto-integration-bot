① ユーザーがLINEでレシート画像を送信<br>
② LINEサーバーがWebhookを呼び出す<br>
③ Vercel上のNext.js API(route.ts)が受信<br>
④ route.tsがLINE APIから画像本体を取得<br>
⑤ route.tsがGemini APIへ画像を送信<br>
⑥ Geminiがレシート内容を解析<br>
⑦ JSON形式で結果を返す<br>
⑧ route.tsが結果を受け取る<br>
⑨ Google Sheetsへ保存<br>
