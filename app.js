const state = {
  data: null,
  episodes: [],
  filtered: [],
  activeIndex: 0,
  section: "story",
};

const els = {
  body: document.body,
  fontToggle: document.querySelector("#fontToggle"),
  artPanel: document.querySelector("#artPanel"),
  artIcon: document.querySelector("#artIcon"),
  artLabel: document.querySelector("#artLabel"),
  activeDate: document.querySelector("#activeDate"),
  activeTitle: document.querySelector("#activeTitle"),
  audioPlayer: document.querySelector("#audioPlayer"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  tabs: document.querySelectorAll(".tab"),
  transcriptText: document.querySelector("#transcriptText"),
  sourceLink: document.querySelector("#sourceLink"),
  monthFilter: document.querySelector("#monthFilter"),
  searchInput: document.querySelector("#searchInput"),
  episodeList: document.querySelector("#episodeList"),
  countText: document.querySelector("#countText"),
  updatedText: document.querySelector("#updatedText"),
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const monthFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
});

const normalize = (value) => value.toLowerCase().trim();

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (value) => dateFormatter.format(new Date(`${value}T00:00:00+08:00`));

const activeEpisode = () => state.episodes[state.activeIndex];

const setLargeText = (enabled) => {
  els.body.classList.toggle("large-text", enabled);
  els.fontToggle.setAttribute("aria-pressed", String(enabled));
  localStorage.setItem("largeText", enabled ? "1" : "0");
};

const monthKey = (episode) => episode.date.slice(0, 7);

const populateMonths = () => {
  const months = Array.from(new Set(state.episodes.map(monthKey)));
  els.monthFilter.innerHTML = [
    `<option value="">全部月份</option>`,
    ...months.map((month) => {
      const label = monthFormatter.format(new Date(`${month}-01T00:00:00+08:00`));
      return `<option value="${month}">${label}</option>`;
    }),
  ].join("");
};

const sectionText = (episode) => {
  const content = episode.sections[state.section] || "";
  return content || episode.transcript || "這一段沒有文字。";
};

const setActiveEpisode = (index, shouldPlay = false) => {
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

  if (shouldPlay) {
    els.audioPlayer.play().catch(() => {});
  }
};

const renderList = () => {
  const search = normalize(els.searchInput.value);
  const month = els.monthFilter.value;

  state.filtered = state.episodes.filter((episode) => {
    const inMonth = !month || monthKey(episode) === month;
    const inSearch = !search || normalize(`${episode.title} ${episode.transcript}`).includes(search);
    return inMonth && inSearch;
  });

  els.countText.textContent = `${state.filtered.length} 篇`;
  els.episodeList.innerHTML = state.filtered
    .map((episode) => {
      const active = episode.id === activeEpisode()?.id ? " active" : "";
      return `
        <button class="episode-card${active}" type="button" data-episode-id="${episode.id}">
          <span class="mini-art" aria-hidden="true">${episode.illustration.icon}</span>
          <span>
            <span class="card-title">${escapeHtml(episode.title)}</span>
            <span class="card-date">${formatDate(episode.date)}</span>
          </span>
          <span class="play-chip">播放</span>
        </button>
      `;
    })
    .join("");
};

const wireEvents = () => {
  els.fontToggle.addEventListener("click", () => {
    setLargeText(!els.body.classList.contains("large-text"));
  });

  els.prevBtn.addEventListener("click", () => setActiveEpisode(state.activeIndex + 1));
  els.nextBtn.addEventListener("click", () => setActiveEpisode(state.activeIndex - 1));

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.section = tab.dataset.section;
      els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
      els.transcriptText.textContent = sectionText(activeEpisode());
    });
  });

  els.monthFilter.addEventListener("change", renderList);
  els.searchInput.addEventListener("input", renderList);

  els.episodeList.addEventListener("click", (event) => {
    const card = event.target.closest(".episode-card");
    if (!card) return;
    const index = state.episodes.findIndex((episode) => episode.id === card.dataset.episodeId);
    if (index >= 0) setActiveEpisode(index, true);
  });
};

const init = async () => {
  setLargeText(localStorage.getItem("largeText") === "1");
  const response = await fetch("data/episodes.json");
  state.data = await response.json();
  state.episodes = state.data.episodes;

  populateMonths();
  setActiveEpisode(0);
  renderList();
  wireEvents();

  const updated = new Date(state.data.updatedAt);
  els.updatedText.textContent = `資料更新：${updated.toLocaleString("zh-TW")}，範圍：${state.data.range.start} 到 ${state.data.range.end}`;
};

init().catch((error) => {
  els.activeDate.textContent = "讀取失敗";
  els.activeTitle.textContent = "資料暫時無法載入";
  els.transcriptText.textContent = error.message;
});
