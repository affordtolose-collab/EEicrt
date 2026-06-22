import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "https://www.icrt.com.tw/news_lunchbox.php";

const formatDate = (date) => date.toISOString().slice(0, 10);
const defaultEnd = new Date(Date.now() + 36 * 60 * 60 * 1000);
const defaultStart = new Date(defaultEnd);
defaultStart.setUTCFullYear(defaultStart.getUTCFullYear() - 1);

const START_DATE = process.env.START_DATE || formatDate(defaultStart);
const END_DATE = process.env.END_DATE || formatDate(defaultEnd);

const paramsFor = (start, end) => {
  const params = new URLSearchParams({
    s_date: start,
    e_date: end,
    lunchbox_sort: "1",
    mlevel1: "7",
    mlevel2: "96",
  });
  return `${BASE_URL}?${params.toString()}`;
};

const decodeEntities = (value) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”");

const cleanText = (html) =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );

const titleFromTranscript = (transcript) => {
  const line = transcript
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !/^[-_]{5,}$/.test(item));
  return line || "News for Kids";
};

const illustrationFor = (title, transcript) => {
  const text = `${title} ${transcript}`.toLowerCase();
  const options = [
    [/tortoise|turtle|pet|animal|dog|cat|bird/, { icon: "🐢", theme: "nature", label: "動物故事" }],
    [/street|traffic|cross|signal|road|bus|train|bike|car/, { icon: "🚦", theme: "city", label: "交通安全" }],
    [/space|satellite|moon|planet|rocket/, { icon: "🛰️", theme: "sky", label: "太空科技" }],
    [/robot|ai|computer|technology|phone|screen/, { icon: "🤖", theme: "tech", label: "科技生活" }],
    [/school|student|teacher|class|book|read/, { icon: "📚", theme: "study", label: "校園學習" }],
    [/food|fruit|rice|tea|farm/, { icon: "🍱", theme: "food", label: "食物文化" }],
    [/weather|typhoon|rain|sun|earthquake|mountain|ocean/, { icon: "🌦️", theme: "earth", label: "自然環境" }],
    [/music|dance|art|museum|festival/, { icon: "🎨", theme: "arts", label: "藝文生活" }],
  ];
  return options.find(([pattern]) => pattern.test(text))?.[1] || { icon: "📰", theme: "news", label: "今日新聞" };
};

const splitSections = (transcript) => {
  const vocabularyAt = transcript.search(/\bVocabulary\b/i);
  const quizAt = transcript.search(/\bQuiz\b/i);
  const answersAt = transcript.search(/\bAnswers\b/i);
  return {
    story: transcript.slice(0, vocabularyAt > -1 ? vocabularyAt : quizAt > -1 ? quizAt : undefined).trim(),
    vocabulary: vocabularyAt > -1 ? transcript.slice(vocabularyAt, quizAt > -1 ? quizAt : undefined).trim() : "",
    quiz: quizAt > -1 ? transcript.slice(quizAt, answersAt > -1 ? answersAt : undefined).trim() : "",
    answers: answersAt > -1 ? transcript.slice(answersAt).trim() : "",
  };
};

const parseKidsEpisodes = (html) => {
  const blocks = html.split('<div class="news_lunchBox_audio">').slice(1);

  return blocks
    .filter((block) => /News for Kids/.test(block))
    .map((block) => {
      const audio = block.match(/<source src="([^"]+)"/)?.[1]?.replace("www.icrt.com.tw//", "www.icrt.com.tw/");
      const date = block.match(/<div class="date">Posted on ([0-9-]+)<\/div>/)?.[1]
        || block.match(/Posted on ([0-9-]+)/)?.[1];
      const transcriptHtml = block.match(/<div class="txts">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1] || "";
      const transcript = cleanText(transcriptHtml);
      const title = titleFromTranscript(transcript);
      const sections = splitSections(transcript);

      return {
        id: `${date}-${audio?.match(/([0-9]+NK)\.mp3/)?.[1] || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        date,
        title,
        audio,
        sourcePage: paramsFor(date, date),
        transcript,
        sections,
        illustration: illustrationFor(title, transcript),
      };
    })
    .filter((episode) => episode.date && episode.audio && episode.transcript);
};

const addDays = (date, days) => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchRange = async (start, end) => {
  const response = await fetch(paramsFor(start, end), {
    headers: { "user-agent": "Mozilla/5.0 ICRT Kids family learning site" },
  });
  if (!response.ok) {
    throw new Error(`ICRT request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
};

const main = async () => {
  const byId = new Map();
  let start = START_DATE;

  while (start <= END_DATE) {
    const end = addDays(start, 6) > END_DATE ? END_DATE : addDays(start, 6);
    const html = await fetchRange(start, end);
    for (const episode of parseKidsEpisodes(html)) {
      byId.set(episode.id, episode);
    }
    console.log(`整理 ${start} 到 ${end}，目前 ${byId.size} 篇`);
    start = addDays(end, 1);
    await sleep(180);
  }

  const episodes = Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date));
  const payload = {
    source: "ICRT News Lunchbox / News for Kids（國小）",
    sourceUrl: "https://www.icrt.com.tw/news_lunchbox.php?mlevel1=7&mlevel2=96",
    updatedAt: new Date().toISOString(),
    range: { start: START_DATE, end: END_DATE },
    count: episodes.length,
    episodes,
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/episodes.json", `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`完成：data/episodes.json，共 ${episodes.length} 篇`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
