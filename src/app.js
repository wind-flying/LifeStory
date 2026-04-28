import { generateNextTurn, generateOpening } from "./engine.js";
import {
  buildExportText,
  createEmptyStory,
  loadSettings,
  loadStory,
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
  stagePill: document.getElementById("stage-pill"),
  turnPill: document.getElementById("turn-pill"),
  generationStatus: document.getElementById("generation-status"),
  storySummary: document.getElementById("story-summary"),
  storyContent: document.getElementById("story-content"),
  choicesContainer: document.getElementById("choices-container"),
  interventionInput: document.getElementById("intervention-input"),
  interventionBadge: document.getElementById("intervention-badge"),
  saveMeta: document.getElementById("save-meta"),
  statePreview: document.getElementById("state-preview"),
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

async function handleChoice(choice) {
  if (isBusy || !currentStory || currentStory.meta.is_finished) {
    return;
  }

  apiSettings = readApiSettings();
  if (!validateApiSettings(apiSettings)) {
    showView("settings");
    return;
  }

  const available = currentStory.intervention_state.available_chances ?? 0;
  const interventionIntent =
    available > 0 ? elements.interventionInput.value.trim() || null : null;

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
      elements.interventionInput.value = "";
    }

    saveStory(currentStory);
    renderStory(currentStory);
    setStatus(currentStory.meta.is_finished ? "故事已收束。" : "已生成下一回合。");
  });
}

async function runGeneration(task) {
  isBusy = true;
  setControlsDisabled(true);
  setStatus("正在调用模型生成内容...");

  try {
    await task();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "生成失败。");
  } finally {
    isBusy = false;
    setControlsDisabled(false);
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
}

function renderStory(story) {
  if (!story) {
    renderEmpty();
    return;
  }

  elements.storyTitle.textContent = story.current_scene.title || "一段尚未成形的人生";
  elements.stagePill.textContent = story.meta.current_stage || "未开始";
  elements.turnPill.textContent = `第 ${story.meta.current_turn} 回合`;
  elements.storySummary.textContent = story.current_scene.summary || "暂无摘要。";

  const content = story.meta.is_finished && story.ending
    ? `${story.current_scene.content}\n\n【人生结语】\n${story.ending.epilogue}\n\n【故事评价】\n${formatEvaluation(story.ending.evaluation)}`
    : story.current_scene.content || "暂无正文。";

  elements.storyContent.textContent = content;

  renderChoices(story);
  renderStatePreview(story);
  renderSaveMeta(story);
  renderIntervention(story);
}

function renderChoices(story) {
  elements.choicesContainer.innerHTML = "";

  if (story.meta.is_finished) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "这一生已经写完了。你可以导出全文，或者重新开始一段新人生。";
    elements.choicesContainer.appendChild(message);
    return;
  }

  for (const choice of story.current_scene.choices ?? []) {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.textContent = choice;
    button.addEventListener("click", () => handleChoice(choice));
    elements.choicesContainer.appendChild(button);
  }
}

function renderIntervention(story) {
  const chances = story.intervention_state.available_chances ?? 0;
  elements.interventionBadge.textContent = `${chances} 次可用`;
  elements.interventionInput.disabled = chances <= 0 || story.meta.is_finished;
  elements.interventionInput.placeholder =
    chances > 0
      ? "输入一句你想主动推动的事，系统会尝试按当前人生状态把它转成合理剧情。"
      : "当前没有可用的主动干预机会。随着人生积累，它可能在后续获得。";
}

function renderStatePreview(story) {
  const facts = (story.story_memory.confirmed_facts ?? []).slice(-3);
  const events = (story.story_memory.major_events ?? []).slice(-3);
  const people = (story.relationships ?? []).slice(0, 4).map((person) => {
    const role = person.role ? `（${person.role}）` : "";
    const relation = person.relationship_summary ? `：${person.relationship_summary}` : "";
    return `${person.name || "未命名人物"}${role}${relation}`;
  });

  elements.statePreview.textContent = [
    `主角：${story.protagonist.name || "未定"}，${story.protagonist.age || "?"} 岁，${story.protagonist.current_role || "身份待定"}`,
    `驱动力：${story.protagonist.career_drive || "未定"} / ${story.protagonist.emotion_drive || "未定"}`,
    `社会资本：${story.protagonist.social_capital || "未定"}，压力：${story.protagonist.stress_level || "未定"}`,
    "",
    "近期关键事实：",
    ...(facts.length ? facts.map((fact) => `- ${fact}`) : ["- 暂无"]),
    "",
    "近期重大事件：",
    ...(events.length ? events.map((event) => `- ${event}`) : ["- 暂无"]),
    "",
    "重要人物：",
    ...(people.length ? people.map((person) => `- ${person}`) : ["- 暂无"]),
  ].join("\n");
}

function renderSaveMeta(story) {
  const text = [
    `故事编号：${story.meta.story_id}`,
    `世界类型：${story.world_state.genre}`,
    `创建时间：${formatDate(story.meta.created_at)}`,
    `最近更新：${formatDate(story.meta.updated_at)}`,
    `章节数：${story.chapters.length}`,
  ].join("\n");

  elements.saveMeta.textContent = text;
  elements.homeSaveMeta.textContent = text;
}

function renderEmpty() {
  elements.storyTitle.textContent = "还没有开始你的人生";
  elements.stagePill.textContent = "未开始";
  elements.turnPill.textContent = "第 0 回合";
  elements.storySummary.textContent =
    "选择开局设定后，系统会生成主角背景、当前局势和第一段人生正文。";
  elements.storyContent.textContent =
    "你看到的会是一段偏小说式的叙事，而不是数值游戏界面。";
  elements.choicesContainer.innerHTML = '<p class="muted">开始后这里会出现 3 到 4 个选项。</p>';
  elements.interventionBadge.textContent = "0 次可用";
  elements.interventionInput.disabled = true;
  elements.interventionInput.placeholder = "当前没有可用的主动干预机会。";
  elements.statePreview.textContent = "故事开始后会在这里显示后台状态摘要。";
  elements.saveMeta.textContent = "当前没有存档。";
  elements.homeSaveMeta.textContent =
    "当前没有存档。设置 API 后即可开始。页面为纯静态结构，可直接部署到 GitHub Pages。";
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
  elements.generationStatus.textContent = message;
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
