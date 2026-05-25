import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export async function POST(req: Request) {
  const body = await req.json();

  const events = body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "image") {
      const messageId = event.message.id;

      console.log("Image received");
      console.log("Message ID:", messageId);

      const imageResponse = await fetch(
        `https://api-data.line.me/v2/bot/message/${messageId}/content`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          },
        },
      );

      console.log("Image fetch status:", imageResponse.status);

      const arrayBuffer = await imageResponse.arrayBuffer();

      console.log("Image size:", arrayBuffer.byteLength);

      const imagePart = {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: "image/jpeg",
        },
      };

      const result = await model.generateContent([
        `
このレシート画像から以下をJSON形式で抽出してください。

{
  "store": "",
  "date": "",
  "total": 0
}

JSONのみ返してください。
`,
        imagePart,
      ]);

      const response = await result.response;
      const text = response.text();

      console.log(text);
    }
  }

  return new Response("OK", {
    status: 200,
  });
}
