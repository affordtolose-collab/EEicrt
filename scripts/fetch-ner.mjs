import { mkdir, writeFile } from "node:fs/promises";

const FEED_URL = "https://feed.firstory.me/rss/user/cknk1t0e9ax110816mx6erqrc";
const SOURCE_URL = "https://ner-kids.firstory.io/episodes";
const end = new Date();
const start = new Date(end);
start.setUTCFullYear(start.getUTCFullYear() - 1);
const START_DATE = process.env.START_DATE || start.toISOString().slice(0, 10);
const END_DATE = process.env.END_DATE || end.toISOString().slice(0, 10);

const decode = (value = "") => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, " ");
const cleanHtml = (html = "") => decode(html).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<li>/gi, "• ").replace(/<\/li>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").replace(/\s*Powered by Firstory Hosting\s*$/i, "").trim();
const tag = (block, name) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "";
const illustrationFor = (title) => {
  const text = title.toLowerCase();
  if (/tech|科技|奈米|ai|機器|太空/.test(text)) return { icon: "🤖", theme: "tech", label: "科技英語" };
  if (/世界|旅行|日本|韓國|國家|冒險/.test(text)) return { icon: "✈️", theme: "sky", label: "世界冒險" };
  if (/童謠|歌|音樂/.test(text)) return { icon: "🎵", theme: "arts", label: "英語童謠" };
  return { icon: "🎧", theme: "study", label: "兒童雙語" };
};

const response = await fetch(FEED_URL, { headers: { "user-agent": "Eason Eddie family learning site" } });
if (!response.ok) throw new Error(`NER RSS request failed: ${response.status}`);
const xml = await response.text();
const episodes = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map((match) => {
  const block = match[1];
  const title = cleanHtml(tag(block, "title"));
  const date = new Date(cleanHtml(tag(block, "pubDate"))).toISOString().slice(0, 10);
  const id = cleanHtml(tag(block, "guid"));
  const audio = block.match(/<enclosure[^>]+url="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
  const sourcePage = cleanHtml(tag(block, "link"));
  const description = cleanHtml(tag(block, "description"));
  return { id, date, title, audio, sourcePage, transcript: description, sections: { story: description }, illustration: illustrationFor(title) };
}).filter((episode) => episode.date >= START_DATE && episode.date <= END_DATE && episode.audio);

const payload = { source: "NER Kids X 兒童雙語 on Air", sourceUrl: SOURCE_URL, feedUrl: FEED_URL, updatedAt: new Date().toISOString(), range: { start: START_DATE, end: END_DATE }, count: episodes.length, episodes };
await mkdir("data", { recursive: true });
await writeFile("data/ner-kids.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(`完成：data/ner-kids.json，共 ${episodes.length} 集`);
