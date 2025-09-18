// pages/api/save-groups.ts
import { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import base64 from "base-64";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const creds = JSON.parse(
      base64.decode(process.env.GSHEET_CREDENTIALS_B64!)
    );

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GSHEET_SHEET_ID!;
    const range = "all!I2:I"; // group column

    const { groups } = req.body; // Array of [group]

    const values = groups.map((group: string) => [group]);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return res.status(200).json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("❌ Google Sheets update failed:", e);
      return res.status(500).json({ error: e.message });
    } else {
      console.error("❌ Unknown error:", e);
      return res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}
