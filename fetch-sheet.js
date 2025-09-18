const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
require("dotenv").config();

const SPREADSHEET_ID = process.env.GSHEET_SHEET_ID;
const SHEET_RANGE = process.env.SHEET_RANGE;
const CREDENTIALS_B64 = process.env.GSHEET_CREDENTIALS_B64;

if (!CREDENTIALS_B64) {
  console.error("❌ Missing GSHEET_CREDENTIALS_B64 in .env");
  process.exit(1);
}

async function fetchSheetData() {
  try {
    // Decode and parse credentials
    const decoded = Buffer.from(CREDENTIALS_B64, "base64").toString("utf-8");
    const credentials = JSON.parse(decoded);

    // Authenticate
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    // Fetch data
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log("⚠️ No data found.");
      return;
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx] || "";
      });
      return obj;
    });

    // Save as JSON
    fs.writeFileSync("sheet-data.json", JSON.stringify(data, null, 2));
    console.log("✅ Saved to sheet-data.json");

    // Save as CSV
    const csv = [headers.join(",")]
      .concat(data.map((row) => headers.map((h) => `"${row[h]}"`).join(",")))
      .join("\n");

    fs.writeFileSync("sheet-data.csv", csv);
    console.log("✅ Saved to sheet-data.csv");
  } catch (error) {
    console.error("❌ Error fetching sheet data:", error.message);
  }
}

fetchSheetData();
