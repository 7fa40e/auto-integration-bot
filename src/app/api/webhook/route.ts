import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 出力させたいJSONの構造（スキーマ）を定義する
const receiptSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    store: {
      type: SchemaType.STRING,
      description: "店舗名",
    },
    date: {
      type: SchemaType.STRING,
      description: "購入日付（YYYY-MM-DD形式、不明なら空文字）",
    },
    total: {
      type: SchemaType.NUMBER,
      description: "合計金額（税込みの総額、数値のみ）",
    },
  },
  required: ["store", "date", "total"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  // 💡 ここでJSON出力とスキーマを強制する
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: receiptSchema,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    // 複数のイベントがある場合は並列で処理、またはPromise.all等で制御するのが理想ですが、
    // まずは個々の処理でエラー落ち（500）しないようにガードします
    for (const event of events) {
      if (event.type === "message" && event.message.type === "image") {
        const messageId = event.message.id;

        console.log("Image received. Message ID:", messageId);

        // 1. LINEから画像取得
        const imageResponse = await fetch(
          `https://api-data.line.me/v2/bot/message/${messageId}/content`,
          {
            headers: {
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
          },
        );

        if (!imageResponse.ok) {
          console.error("LINE Image fetch failed:", imageResponse.status);
          continue; // 次のイベントへ
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        console.log("Image size:", arrayBuffer.byteLength);

        const imagePart = {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString("base64"),
            mimeType: "image/jpeg", // 必要に応じて調整
          },
        };

        // 2. Gemini APIの呼び出し（try-catchで囲む）
        try {
          // プロンプトはシンプルに指示だけでOK。JSONの形は指定不要
          const result = await model.generateContent([
            "このレシート画像から、店舗名、日付、合計金額を抽出してください。",
            imagePart,
          ]);

          const response = await result.response;
          const text = response.text();

          // 確実にJSON文字列として返ってくるため、そのままパースして使えます
          console.log("Gemini Response (JSON):", text);
          // const receiptData = JSON.parse(text);

          // TODO: ここでLINEに返信（Reply）する処理や、DBへの保存処理を行う
          // await sendLineReply(event.replyToken, `店舗: ${receiptData.store}\n金額: ${receiptData.total}円`);
        } catch (geminiError) {
          // 429エラーなど、Gemini側でエラーが起きてもここでキャッチして500エラーを防ぐ
          console.error("Gemini API Error occurred:", geminiError);
          // ユーザーへのエラー通知などの処理を入れると親切です
        }
      }
    }

    // LINEサーバーに対しては、何があっても一旦「200 OK」を素早く返すのがWebhookの基本です
    return new Response("OK", { status: 200 });
  } catch (globalError) {
    console.error("Global Webhook Error:", globalError);
    // リクエストのパース自体に失敗した場合など
    return new Response("Internal Server Error", { status: 500 });
  }
}
