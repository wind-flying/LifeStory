import { generateNextTurn, generateOpening } from "./engine.js";
import {
  buildExportText,
  createEmptyStory,
  getReadableUnitCount,
  loadSettings,
  loadStory,
  normalizeStory,
  saveSettings,
  saveStory,
} from "./state.js";

const SETUP_OPTIONS = {
  world_tone: [
    { value: "友善", description: "城市仍有温度，善意不稀缺，但代价也更隐蔽。" },
    { value: "冷漠", description: "每个人都先顾自己，关系需要靠时间和真心慢慢换来。" },
    { value: "高压", description: "竞争、规训与现实挤压更明显，很多选择会更沉重。" },
  ],
  family_start: [
    { value: "普通", description: "生活不至于困苦，但很多机会仍要靠自己一步步争。" },
    { value: "优渥", description: "你能更早触碰到资源与视野，但也更容易背上期待。" },
    { value: "困顿", description: "你的起点更低，很多温柔与尊严都需要额外努力。" },
  ],
  talent: [
    { value: "才智超群", description: "理解力和抽象能力格外突出，适合走长期积累路线。" },
    { value: "坚韧隐忍", description: "不轻易被打垮，面对挫折时更容易撑过最难的阶段。" },
    { value: "共情力强", description: "更容易理解他人，也更容易被关系深深影响。" },
    { value: "魅力出众", description: "你更容易被记住，也更容易在关键时刻影响别人。" },
  ],
  life_focus: [
    { value: "事业优先", description: "叙事更偏向竞争、成长、选择与成就。" },
    { value: "感情优先", description: "叙事更偏向关系、陪伴、错过与修复。" },
    { value: "平衡发展", description: "事业和感情都不会缺席，故事会更看重取舍。" },
  ],
  text_length: [
    { value: "简短", description: "更轻快，适合手机上快速推进。" },
    { value: "标准", description: "平衡叙事细节与推进速度。" },
    { value: "长篇", description: "章节更长，更像真正的一段小说。" },
  ],
};

const elements = {
  views: {
    home: document.getElementById("view-home"),
    settings: document.getElementById("view-settings"),
    setup: document.getElementById("view-setup"),
    story: document.getElementById("view-story"),
  },
  homeSaveMeta: document.getElementById("home-save-meta"),
  baseUrlInput: document.getElementById("base-url-input"),
  modelInput: document.getElementById("model-input"),
  apiKeyInput: document.getElementById("api-key-input"),
  worldToneOptions: document.getElementById("world-tone-options"),
  familyStartOptions: document.getElementById("family-start-options"),
  talentOptions: document.getElementById("talent-options"),
  lifeFocusOptions: document.getElementById("life-focus-options"),
  textLengthOptions: document.getElementById("text-length-options"),
  saveSettingsBtn: document.getElementById("save-settings-btn"),
  goSettingsBtn: document.getElementById("go-settings-btn"),
  goSetupBtn: document.getElementById("go-setup-btn"),
  newStoryBtn: document.getElementById("new-story-btn"),
  continueBtn: document.getElementById("continue-btn"),
  exportBtn: document.getElementById("export-btn"),
  storyTitle: document.getElementById("story-title"),
  readerMeta: document.getElementById("reader-meta"),
  storyStream: document.getElementById("story-stream"),
  readerTapLayer: document.getElementById("reader-tap-layer"),
  loadingIndicator: document.getElementById("loading-indicator"),
  tapHint: document.getElementById("tap-hint"),
  decisionPanel: document.getElementById("decision-panel"),
  choicesContainer: document.getElementById("choices-container"),
};

let apiSettings = loadSettings();
let currentStory = loadStory();
let setupSelections = {
  world_type: "modern_city",
  world_tone: "友善",
  family_start: "普通",
  talent: "才智超群",
  life_focus: "事业优先",
  text_length: "标准",
};
let isBusy = false;

hydrateSettings();
renderSetupOptions();
renderStory(currentStory);
bindEvents();

function bindEvents() {
  elements.goSettingsBtn.addEventListener("click", () => showView("settings"));
  elements.goSetupBtn.addEventListener("click", () => showView("setup"));
  elements.saveSettingsBtn.addEventListener("click", () => {
    apiSettings = readApiSettings();
    saveSettings(apiSettings);
    setStatus("API 设置已保存。");
  });

  elements.newStoryBtn.addEventListener("click", startNewStory);
  elements.readerTapLayer.addEventListener("click", handleReaderTap);
  elements.continueBtn.addEventListener("click", () => {
    currentStory = loadStory();
    renderStory(currentStory);
    if (currentStory) {
      showView("story");
    }
    setStatus(currentStory ? "已载入上次存档。" : "当前没有可继续的存档。");
  });
  elements.exportBtn.addEventListener("click", exportStory);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-view");
      if (target) {
        showView(target);
      }
    });
  });
}

function hydrateSettings() {
  elements.baseUrlInput.value = apiSettings.baseUrl ?? "";
  elements.modelInput.value = apiSettings.model ?? "";
  elements.apiKeyInput.value = apiSettings.apiKey ?? "";
}

function renderSetupOptions() {
  renderOptionGroup(elements.worldToneOptions, "world_tone", SETUP_OPTIONS.world_tone);
  renderOptionGroup(elements.familyStartOptions, "family_start", SETUP_OPTIONS.family_start);
  renderOptionGroup(elements.talentOptions, "talent", SETUP_OPTIONS.talent);
  renderOptionGroup(elements.lifeFocusOptions, "life_focus", SETUP_OPTIONS.life_focus);
  renderOptionGroup(elements.textLengthOptions, "text_length", SETUP_OPTIONS.text_length);
}

function renderOptionGroup(container, key, options) {
  container.innerHTML = "";
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `setup-option${setupSelections[key] === option.value ? " active" : ""}`;
    button.innerHTML = `
      <span class="setup-option-title">${option.value}</span>
      <span class="setup-option-desc">${option.description}</span>
    `;
    button.addEventListener("click", () => {
      setupSelections[key] = option.value;
      renderSetupOptions();
    });
    container.appendChild(button);
  }
}

function readApiSettings() {
  return {
    baseUrl: elements.baseUrlInput.value.trim(),
    model: elements.modelInput.value.trim(),
    apiKey: elements.apiKeyInput.value.trim(),
  };
}

function readStorySettings() {
  return { ...setupSelections };
}

async function startNewStory() {
  if (isBusy) {
    return;
  }

  apiSettings = readApiSettings();
  if (!validateApiSettings(apiSettings)) {
    showView("settings");
    return;
  }

  saveSettings(apiSettings);
  const story = createEmptyStory(readStorySettings());

  await runGeneration(async () => {
    currentStory = await generateOpening(story, apiSettings);
    saveStory(currentStory);
    renderStory(currentStory);
    showView("story");
    setStatus("新的故事已经开始。");
  });
}

async function handleChoice(choice, interventionIntent = null) {
  if (isBusy || !currentStory || currentStory.meta.is_finished) {
    return;
  }

  apiSettings = readApiSettings();
  if (!validateApiSettings(apiSettings)) {
    showView("settings");
    return;
  }

  await runGeneration(async () => {
    currentStory = await generateNextTurn(currentStory, apiSettings, choice, interventionIntent);

    if (interventionIntent) {
      currentStory.intervention_state.past_interventions = [
        ...(currentStory.intervention_state.past_interventions ?? []),
        {
          used_at_turn: currentStory.meta.current_turn,
          intent: interventionIntent,
        },
      ];
    }

    saveStory(currentStory);
    renderStory(currentStory);
    setStatus(currentStory.meta.is_finished ? "故事已收束。" : "已生成下一回合。");
  });
}

async function handleReaderTap() {
  if (!currentStory || isBusy) {
    return;
  }

  const totalUnits = getReadableUnitCount(currentStory);
  if ((currentStory.reader.revealed_units ?? 0) < totalUnits) {
    revealNextUnit();
    return;
  }

  if (currentStory.current_decision || currentStory.meta.is_finished) {
    return;
  }

  await continueNarration();
}

async function continueNarration() {
  apiSettings = readApiSettings();
  if (!validateApiSettings(apiSettings)) {
    showView("settings");
    return;
  }

  await runGeneration(async () => {
    currentStory = await generateNextTurn(currentStory, apiSettings, null, null);
    saveStory(currentStory);
    renderStory(currentStory);
    setStatus(currentStory.meta.is_finished ? "故事已收束。" : "已生成下一段人生。");
  });
}

async function runGeneration(task) {
  isBusy = true;
  setControlsDisabled(true);
  elements.loadingIndicator.hidden = false;
  setStatus("正在调用模型生成内容...");

  try {
    await task();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "生成失败。");
  } finally {
    isBusy = false;
    elements.loadingIndicator.hidden = true;
    setControlsDisabled(false);
    if (currentStory) {
      updateTapHint(currentStory);
    }
  }
}

function validateApiSettings(settings) {
  if (!settings.baseUrl || !settings.model || !settings.apiKey) {
    setStatus("请先填写 Base URL、模型名和 API Key。");
    return false;
  }
  return true;
}

function setControlsDisabled(disabled) {
  elements.saveSettingsBtn.disabled = disabled;
  elements.newStoryBtn.disabled = disabled;
  elements.continueBtn.disabled = disabled;
  elements.exportBtn.disabled = disabled;
  elements.readerTapLayer.disabled = disabled;
  elements.readerTapLayer.classList.toggle("busy", disabled);
}

function renderStory(story) {
  if (!story) {
    renderEmpty();
    return;
  }

  currentStory = normalizeStory(story);
  const latestSegment = currentStory.segments.at(-1);

  elements.storyTitle.textContent = latestSegment?.title || "一段正在展开的人生";
  renderReaderMeta(currentStory);

  renderStoryStream(currentStory);
  renderChoices(currentStory);
  renderSaveMeta(currentStory);
  updateTapHint(currentStory);
  scrollStoryToBottom();
}

function renderChoices(story) {
  elements.choicesContainer.innerHTML = "";
  const totalUnits = getReadableUnitCount(story);
  const allRevealed = (story.reader.revealed_units ?? 0) >= totalUnits;
  elements.decisionPanel.hidden = true;

  if (story.meta.is_finished) {
    return;
  }

  if (!allRevealed) {
    return;
  }

  if (!story.current_decision) {
    return;
  }

  elements.decisionPanel.hidden = false;
  const prompt = document.createElement("p");
  prompt.className = "decision-prompt";
  prompt.textContent = story.current_decision.prompt;
  elements.choicesContainer.appendChild(prompt);

  for (const choice of story.current_decision.choices ?? []) {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.textContent = choice;
    button.addEventListener("click", () => handleChoice(choice));
    elements.choicesContainer.appendChild(button);
  }

  const chances = story.intervention_state.available_chances ?? 0;
  if (chances > 0) {
    const button = document.createElement("button");
    button.className = "choice-button intervention-choice";
    button.textContent = "主动干预一次";
    button.addEventListener("click", handleInterventionChoice);
    elements.choicesContainer.appendChild(button);
  }
}

function handleInterventionChoice() {
  if (!currentStory?.current_decision || isBusy) {
    return;
  }

  const intent = window.prompt("你想主动推动什么？输入一句意图，不是强制结果。");
  const interventionIntent = intent?.trim();

  if (!interventionIntent) {
    return;
  }

  handleChoice("主动干预", interventionIntent);
}

function renderSaveMeta(story) {
  const text = [
    `故事编号：${story.meta.story_id}`,
    `世界类型：${story.world_state.genre}`,
    `创建时间：${formatDate(story.meta.created_at)}`,
    `最近更新：${formatDate(story.meta.updated_at)}`,
    `片段数：${story.segments.length}`,
  ].join("\n");

  elements.homeSaveMeta.textContent = text;
}

function renderEmpty() {
  elements.storyTitle.textContent = "还没有开始你的人生";
  elements.readerMeta.textContent = "未开始 · 第 0 回合 · 等待开始";
  elements.storyStream.innerHTML = '<p class="muted">故事开始后会在这里向下展开。</p>';
  elements.decisionPanel.hidden = true;
  elements.tapHint.textContent = "开始故事后点击正文继续";
  elements.homeSaveMeta.textContent =
    "当前没有存档。设置 API 后即可开始。页面为纯静态结构，可直接部署到 GitHub Pages。";
}

function renderStoryStream(story) {
  elements.storyStream.innerHTML = "";
  const visibleUnits = flattenStoryUnits(story).slice(0, story.reader.revealed_units ?? 0);

  if (!visibleUnits.length) {
    elements.storyStream.innerHTML = '<p class="muted">点击“继续阅读”，故事会逐段展开。</p>';
    return;
  }

  for (const unit of visibleUnits) {
    if (unit.type === "choice") {
      const choice = document.createElement("div");
      choice.className = "story-choice-record";
      choice.textContent = unit.text;
      elements.storyStream.appendChild(choice);
      continue;
    }

    const paragraph = document.createElement("article");
    paragraph.className = "story-unit";

    if (unit.showHeader) {
      const header = document.createElement("div");
      header.className = "story-unit-header";
      header.textContent = [unit.title, unit.age_range].filter(Boolean).join(" · ");
      paragraph.appendChild(header);
    }

    const text = document.createElement("p");
    text.textContent = unit.text;
    paragraph.appendChild(text);
    elements.storyStream.appendChild(paragraph);
  }

  if (story.meta.is_finished && story.ending && visibleUnits.length >= getReadableUnitCount(story)) {
    const ending = document.createElement("article");
    ending.className = "story-unit ending-unit";
    const header = document.createElement("div");
    header.className = "story-unit-header";
    header.textContent = "人生结语";
    const epilogue = document.createElement("p");
    epilogue.textContent = story.ending.epilogue ?? "";
    const evaluation = document.createElement("p");
    evaluation.textContent = formatEvaluation(story.ending.evaluation);
    ending.append(header, epilogue, evaluation);
    elements.storyStream.appendChild(ending);
  }
}

function flattenStoryUnits(story) {
  return (story.segments ?? []).flatMap((segment) => {
    if (segment.type === "choice") {
      return [{ type: "choice", text: segment.text }];
    }

    const paragraphs = segment.paragraphs?.length ? segment.paragraphs : [segment.summary].filter(Boolean);
    return paragraphs.map((paragraph, index) => ({
      type: "paragraph",
      title: segment.title,
      age_range: segment.age_range,
      text: paragraph,
      showHeader: index === 0 && Boolean(segment.title || segment.age_range),
    }));
  });
}

function revealNextUnit() {
  if (!currentStory || isBusy) {
    return;
  }

  const totalUnits = getReadableUnitCount(currentStory);
  if ((currentStory.reader.revealed_units ?? 0) >= totalUnits) {
    return;
  }

  currentStory.reader.revealed_units += 1;
  saveStory(currentStory);
  renderStory(currentStory);
}

function updateTapHint(story) {
  const totalUnits = getReadableUnitCount(story);
  const revealed = story.reader.revealed_units ?? 0;

  if (story.meta.is_finished) {
    elements.tapHint.textContent = "这一生已经写完";
    return;
  }

  if (revealed < totalUnits) {
    elements.tapHint.textContent = "点击正文继续阅读";
    return;
  }

  if (story.current_decision) {
    elements.tapHint.textContent = "请选择一个方向";
    return;
  }

  elements.tapHint.textContent = "点击正文继续人生";
}

function scrollStoryToBottom() {
  requestAnimationFrame(() => {
    elements.storyStream.scrollTop = elements.storyStream.scrollHeight;
  });
}

function exportStory() {
  if (!currentStory) {
    setStatus("当前没有可导出的故事。");
    return;
  }

  const blob = new Blob([buildExportText(currentStory)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `LifeStory-${currentStory.meta.story_id}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("已导出当前故事。");
}

function setStatus(message) {
  if (currentStory) {
    renderReaderMeta(currentStory, message);
  } else {
    elements.readerMeta.textContent = `未开始 · 第 0 回合 · ${message}`;
  }
}

function renderReaderMeta(story, status = elements.readerMeta.textContent.split(" · ").at(-1)) {
  elements.readerMeta.textContent = [
    story.meta.current_stage || "未开始",
    `第 ${story.meta.current_turn} 回合`,
    status || "等待开始",
  ].join(" · ");
}

function showView(name) {
  for (const [key, view] of Object.entries(elements.views)) {
    view.classList.toggle("active", key === name);
  }
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("zh-CN");
  } catch {
    return value;
  }
}

function formatEvaluation(evaluation) {
  if (!evaluation) {
    return "暂无。";
  }

  return Object.entries(evaluation)
    .map(([key, value]) => `${key}：${value || "未提供"}`)
    .join("\n");
}
