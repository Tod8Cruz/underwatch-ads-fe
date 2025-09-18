import { google } from "googleapis";
import base64 from "base-64";
import { Ad } from "../types/ad";

export async function fetchAdsFromSheet(): Promise<Ad[]> {
  const spreadsheetId = process.env.GSHEET_SHEET_ID!;
  const range = process.env.SHEET_RANGE || "all!A1:I";
  const creds = JSON.parse(base64.decode(process.env.GSHEET_CREDENTIALS_B64!));

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const [headers, ...rows] = res.data.values || [];

  return rows.map((row) => {
    const obj: Partial<Ad> = {};
    headers.forEach((h, i) => {
      obj[h as keyof Ad] = row[i] || "";
    });

    if (obj["start_date"]) {
      const d = new Date(obj["start_date"]);
      if (!isNaN(d.getTime())) {
        obj["start_date"] = d.toISOString().split("T")[0];
      }
    }

    return obj as Ad;
  });
}
