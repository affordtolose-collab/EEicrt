const CHANNELS = {
  icrt: {
    dataUrl: "data/episodes.json",
    eyebrow: "ICRT News for Kids（國小）",
    sourceLabel: "ICRT 原始頁面",
    footer: "內容來源：ICRT News Lunchbox。此小站整理給家人練習聽讀使用。",
    hasSections: true,
  },
  ner: {
    dataUrl: "data/ner-kids.json",
    eyebrow: "NER Kids X 兒童雙語 on Air",
    sourceLabel: "Firstory 原始節目頁面",
    footer: "內容來源：NER 國立教育廣播電臺。此小站整理給家人練習聽讀使用。",
    hasSections: false,
  },
};

const state = { channel: "icrt", datasets: {}, data: null, episodes: [], filtered: [], activeIndex: 0, section: "story" };

const els = {
  body: document.body,
  fontToggle: document.querySelector("#fontToggle"),
  channelEyebrow: document.querySelector("#channelEyebrow"),
  channelButtons: document.querySelectorAll(".channel-button"),
  artPanel: document.querySelector("#artPanel"), artIcon: document.querySelector("#artIcon"), artLabel: document.querySelector("#artLabel"),
  activeDate: document.querySelector("#activeDate"), activeTitle: document.querySelector("#activeTitle"), audioPlayer: document.querySelector("#audioPlayer"),
  prevBtn: document.querySelector("#prevBtn"), nextBtn: document.querySelector("#nextBtn"), sectionTabs: document.querySelector("#sectionTabs"),
  tabs: document.querySelectorAll(".tab"), transcriptText: document.querySelector("#transcriptText"), sourceLink: document.querySelector("#sourceLink"),
  monthFilter: document.querySelector("#monthFilter"), searchInput: document.querySelector("#searchInput"), episodeList: document.querySelector("#episodeList"),
  countText: document.querySelector("#countText"), updatedText: document.querySelector("#updatedText"), sourceText: document.querySelector("#sourceText"),
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" });
const normalize = (value = "") => value.toLowerCase().trim();
const escapeHtml = (value = "") => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const formatDate = (value) => dateFormatter.format(new Date(`${value}T00:00:00+08:00`));
const activeEpisode = () => state.episodes[state.activeIndex];
const monthKey = (episode) => episode.date.slice(0, 7);

const setLargeText = (enabled) => {
  els.body.classList.toggle("large-text", enabled);
  els.fontToggle.setAttribute("aria-pressed", String(enabled));
  localStorage.setItem("largeText", enabled ? "1" : "0");
};

const populateMonths = () => {
  const months = Array.from(new Set(state.episodes.map(monthKey)));
  els.monthFilter.innerHTML = [`<option value="">全部月份</option>`, ...months.map((month) => `<option value="${month}">${monthFormatter.format(new Date(`${month}-01T00:00:00+08:00`))}</option>`)].join("");
};

const sectionText = (episode) => episode.sections?.[state.section] || episode.transcript || episode.description || "這一段沒有文字。";

const setActiveEpisode = (index, shouldPlay = false) => {
  if (!state.episodes.length) return;
  const nextIndex = Math.max(0, Math.min(index, state.episodes.length - 1));
  state.activeIndex = nextIndex;
  const episode = activeEpisode();
  els.activeDate.textContent = formatDate(episode.date);
  els.activeTitle.textContent = episode.title;
  els.audioPlayer.src = episode.audio;
  els.transcriptText.textContent = sectionText(episode);
  els.sourceLink.href = episode.sourcePage;
  els.artIcon.textContent = episode.illustration.icon;
  els.artLabel.textContent = episode.illustration.label;
  els.artPanel.className = `art-panel ${episode.illustration.theme}`;
  els.prevBtn.disabled = nextIndex === state.episodes.length - 1;
  els.nextBtn.disabled = nextIndex === 0;
  document.querySelectorAll(".episode-card.active").forEach((card) => card.classList.remove("active"));
  document.querySelector(`[data-episode-id="${CSS.escape(episode.id)}"]`)?.classList.add("active");
  if (shouldPlay) els.audioPlayer.play().catch(() => {});
};

const renderList = () => {
  const search = normalize(els.searchInput.value);
  const month = els.monthFilter.value;
  state.filtered = state.episodes.filter((episode) => (!month || monthKey(episode) === month) && (!search || normalize(`${episode.title} ${episode.transcript || episode.description}`).includes(search)));
  els.countText.textContent = `${state.filtered.length} 集`;
  els.episodeList.innerHTML = state.filtered.map((episode) => `
    <button class="episode-card${episode.id === activeEpisode()?.id ? " active" : ""}" type="button" data-episode-id="${escapeHtml(episode.id)}">
      <span class="mini-art" aria-hidden="true">${episode.illustration.icon}</span>
      <span><span class="card-title">${escapeHtml(episode.title)}</span><span class="card-date">${formatDate(episode.date)}</span></span>
      <span class="play-chip">播放</span>
    </button>`).join("");
};

const switchChannel = async (channel) => {
  const config = CHANNELS[channel];
  els.audioPlayer.pause();
  els.activeDate.textContent = "載入中";
  els.activeTitle.textContent = "正在整理節目";
  if (!state.datasets[channel]) {
    const response = await fetch(config.dataUrl);
    if (!response.ok) throw new Error(`無法讀取 ${config.dataUrl}`);
    state.datasets[channel] = await response.json();
  }
  state.channel = channel;
  state.data = state.datasets[channel];
  state.episodes = state.data.episodes;
  state.activeIndex = 0;
  state.section = "story";
  els.channelButtons.forEach((button) => {
    const active = button.dataset.channel === channel;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.section === "story"));
  els.sectionTabs.hidden = !config.hasSections;
  els.channelEyebrow.textContent = config.eyebrow;
  els.sourceLink.textContent = config.sourceLabel;
  els.sourceText.textContent = config.footer;
  els.searchInput.value = "";
  populateMonths();
  setActiveEpisode(0);
  renderList();
  const updated = new Date(state.data.updatedAt);
  els.updatedText.textContent = `資料更新：${updated.toLocaleString("zh-TW")}，範圍：${state.data.range.start} 到 ${state.data.range.end}`;
  localStorage.setItem("channel", channel);
};

const wireEvents = () => {
  els.fontToggle.addEventListener("click", () => setLargeText(!els.body.classList.contains("large-text")));
  els.channelButtons.forEach((button) => button.addEventListener("click", () => switchChannel(button.dataset.channel).catch(showError)));
  els.prevBtn.addEventListener("click", () => setActiveEpisode(state.activeIndex + 1));
  els.nextBtn.addEventListener("click", () => setActiveEpisode(state.activeIndex - 1));
  els.tabs.forEach((tab) => tab.addEventListener("click", () => {
    state.section = tab.dataset.section;
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    els.transcriptText.textContent = sectionText(activeEpisode());
  }));
  els.monthFilter.addEventListener("change", renderList);
  els.searchInput.addEventListener("input", renderList);
  els.episodeList.addEventListener("click", (event) => {
    const card = event.target.closest(".episode-card");
    if (!card) return;
    const index = state.episodes.findIndex((episode) => episode.id === card.dataset.episodeId);
    if (index >= 0) setActiveEpisode(index, true);
  });
};

const showError = (error) => {
  els.activeDate.textContent = "讀取失敗";
  els.activeTitle.textContent = "資料暫時無法載入";
  els.transcriptText.textContent = error.message;
};

setLargeText(localStorage.getItem("largeText") === "1");
wireEvents();
switchChannel(localStorage.getItem("channel") in CHANNELS ? localStorage.getItem("channel") : "icrt").catch(showError);
