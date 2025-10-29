import { Router } from "express";
import Parser from "rss-parser";
import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const rssRouter = Router();
const parser = new Parser({
  headers: { "User-Agent": "TrainBookingApp-RSS/1.0" },
});
// === cấu hình nguồn & cache (giữ nguyên như bản trước) ===
const FEEDS = [
  "https://vnexpress.net/rss/du-lich.rss",
  "https://tuoitre.vn/rss/du-lich.rss",
];

const DEFAULT_KEYWORDS = [
  "tàu hỏa",
  "tàu hoả",
  "đường sắt",
  "tàu thống nhất",
  "SE1",
  "SE2",
  "SE3",
  "SE4",
  "ga",
  "toa",
  "giường nằm",
  "train",
  "railway",
];

let CACHE = { at: 0, minutes: 10, data: [] };
const isCacheFresh = () => Date.now() - CACHE.at < CACHE.minutes * 60 * 1000;

const extractFirstImage = (html) => {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
};
const linkToId = (url) =>
  crypto
    .createHash("md5")
    .update(url || "")
    .digest("hex");

const normalizeItem = (item, sourceTitle = "") => {
  const link = item.link || "";
  const publishedAt = item.isoDate || item.pubDate || null;
  return {
    id: linkToId(link),
    title: item.title || "",
    link,
    source: sourceTitle || item.creator || "",
    summary: item.contentSnippet || item.content?.replace(/<[^>]+>/g, "") || "",
    image: item.enclosure?.url || extractFirstImage(item.content) || null,
    published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
  };
};

const dedupeByLink = (arr) => {
  const seen = new Set();
  return arr.filter((x) => {
    if (!x.link || seen.has(x.link)) return false;
    seen.add(x.link);
    return true;
  });
};

const fetchAllFeeds = async () => {
  const results = await Promise.allSettled(
    FEEDS.map(async (url) => {
      const feed = await new Parser().parseURL(url);
      return (feed.items || []).map((it) => normalizeItem(it, feed.title));
    })
  );
  const merged = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter(Boolean);
  merged.sort(
    (a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0)
  );
  return dedupeByLink(merged);
};

// List
rssRouter.get("/train-articles", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(req.query.pageSize || "20", 10))
    );
    const fresh = req.query.fresh === "1";

    if (!isCacheFresh() || fresh || CACHE.data.length === 0) {
      const data = await fetchAllFeeds();
      CACHE = { at: Date.now(), minutes: CACHE.minutes, data };
    }

    const keywords = q
      ? q
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_KEYWORDS;
    const includes = (text) =>
      text &&
      keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()));
    const filtered = CACHE.data.filter(
      (it) => includes(it.title) || includes(it.summary)
    );

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    res.json({
      ok: true,
      page,
      pageSize,
      total,
      keywords,
      items,
      cached: isCacheFresh() && !fresh,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "Failed to fetch feeds." });
  }
});

// Detail
const DETAIL_CACHE = new Map();
const DETAIL_TTL_MS = 15 * 60 * 1000;
const pickMainContent = ($) => {
  const sels = [
    "article",
    ".article-content",
    ".content-detail",
    ".entry-content",
    "#main-content",
    ".post-content",
    ".news-content",
    ".main-content",
  ];
  for (const sel of sels) {
    const el = $(sel);
    if (el && el.length && el.text().trim().length > 120) return el.html();
  }
  return $("body").html();
};

rssRouter.get("/train-articles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isCacheFresh() || CACHE.data.length === 0) {
      const data = await fetchAllFeeds();
      CACHE = { at: Date.now(), minutes: CACHE.minutes, data };
    }
    const item = CACHE.data.find((x) => x.id === id);
    if (!item)
      return res.status(404).json({ ok: false, message: "Article not found" });

    const c = DETAIL_CACHE.get(id);
    if (c && Date.now() - c.at < DETAIL_TTL_MS)
      return res.json({ ok: true, cached: true, ...c.value });

    const resp = await fetch(item.link, {
      headers: { "User-Agent": "TrainBookingApp-RSS/1.0" },
    });
    const html = await resp.text();
    const $ = cheerio.load(html);

    const pageTitle =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      item.title;
    const ogImg = $('meta[property="og:image"]').attr("content");
    const detail = {
      id,
      title: pageTitle,
      link: item.link,
      source: item.source,
      image: ogImg || item.image || null,
      published_at: item.published_at,
      summary: item.summary,
      content_html: pickMainContent($) || null,
    };

    DETAIL_CACHE.set(id, { at: Date.now(), value: detail });
    res.json({ ok: true, cached: false, ...detail });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ ok: false, message: "Failed to fetch article detail." });
  }
});

export default rssRouter;
