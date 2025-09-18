// pages/api/ads.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchAdsFromSheet } from "../../fetcher/googleSheets";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { offset = 0, limit = 20 } = req.query;
  const ads = await fetchAdsFromSheet();
  const sliced = ads.slice(Number(offset), Number(offset) + Number(limit));
  res.status(200).json(sliced);
}
