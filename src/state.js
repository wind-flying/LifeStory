import { getWorldConfig } from "./worlds.js";

const SETTINGS_KEY = "lifeStory.settings";
const STORY_KEY = "lifeStory.currentStory";

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "",
    };
  } catch {
    return {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "",
    };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadStory() {
  try {
    return JSON.parse(localStorage.getItem(STORY_KEY)) ?? null;
  } catch {
    return null;
  }
}

export function saveStory(story) {
  localStorage.setItem(STORY_KEY, JSON.stringify(story));
}

export function createEmptyStory(settings) {
  const timestamp = new Date().toISOString();
  const worldConfig = getWorldConfig(settings.world_type);

  return {
    meta: {
      story_id: crypto.randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
      current_turn: 0,
      current_stage: "未开始",
      is_finished: false,
    },
    settings,
    world_state: {
      world_type: worldConfig.id,
      genre: worldConfig.genre,
      tone_summary: "",
      competition_level: worldConfig.stateDefaults.competition_level,
      mobility_level: worldConfig.stateDefaults.mobility_level,
      hidden_supernatural_seed: worldConfig.stateDefaults.hidden_supernatural_seed,
      world_rules: [...worldConfig.worldRules],
    },
    protagonist: {
      name: "",
      age: 0,
      stage: "未开始",
      background_summary: "",
      current_role: "",
      core_traits: [],
      career_drive: "",
      emotion_drive: "",
      stress_level: "medium",
      health_state: "stable",
      resource_level: "medium",
      social_capital: "low",
    },
    abilities: {
      cognition: "medium",
      social: "medium",
      execution: "medium",
      resilience: "medium",
    },
    relationships: [],
    story_memory: {
      confirmed_facts: [],
      major_events: [],
      open_threads: [],
      foreshadowing: [],
      resolved_threads: [],
      forbidden_conflicts: [],
    },
    intervention_state: {
      available_chances: 0,
      earned_sources: [],
      pending_intent: null,
      past_interventions: [],
    },
    chapters: [],
    current_scene: {
      title: "",
      summary: "",
      content: "",
      choices: [],
    },
  };
}

export function mergeStoryState(story, patch) {
  const next = structuredClone(story);

  deepMerge(next, patch);

  next.meta.updated_at = new Date().toISOString();
  return next;
}

function deepMerge(target, source) {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      target[key] = value;
      continue;
    }

    if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
      continue;
    }

    target[key] = value;
  }
}

export function buildExportText(story) {
  const lines = [];
  lines.push("《LifeStory 人生记录》");
  lines.push("");
  lines.push(`故事编号：${story.meta.story_id}`);
  lines.push(`世界类型：${story.world_state.genre}`);
  lines.push(`当前阶段：${story.meta.current_stage}`);
  lines.push(`当前回合：${story.meta.current_turn}`);
  lines.push("");

  for (const chapter of story.chapters) {
    lines.push(`# ${chapter.title}`);
    lines.push("");
    lines.push(`【局势】${chapter.summary}`);
    lines.push("");
    lines.push(chapter.content);
    lines.push("");
  }

  return lines.join("\n");
}
