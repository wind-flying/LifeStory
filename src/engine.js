import { requestStoryJson } from "./llm.js";
import { buildOpeningMessages, buildTurnMessages } from "./prompts.js";
import { getReadableUnitCount, mergeStoryState, normalizeStory } from "./state.js";

export async function generateOpening(story, apiSettings) {
  const result = await requestStoryJson(apiSettings, buildOpeningMessages(story));
  return applyModelResult(story, result);
}

export async function generateNextTurn(story, apiSettings, selectedChoice, interventionIntent) {
  const result = await requestStoryJson(
    apiSettings,
    buildTurnMessages(story, selectedChoice, interventionIntent),
  );
  return applyModelResult(story, result, selectedChoice);
}

function applyModelResult(story, result, selectedChoice = null) {
  validateResult(result);

  const normalized = normalizeStory(story);
  const previousUnitCount = getReadableUnitCount(normalized);
  const appendedSegments = [];

  if (selectedChoice) {
    appendedSegments.push({
      id: crypto.randomUUID(),
      type: "choice",
      text: selectedChoice,
    });
  }

  appendedSegments.push(...normalizeSegments(result.segments, result));

  let nextStory = mergeStoryState(normalized, result.state_patch);
  nextStory.segments = [...(normalized.segments ?? []), ...appendedSegments];
  nextStory.current_decision = result.decision ?? null;
  nextStory.reader = {
    ...(nextStory.reader ?? {}),
    revealed_units: Math.min(getReadableUnitCount(nextStory), previousUnitCount + 2),
  };

  if (result.end_story) {
    nextStory.meta.is_finished = true;
    nextStory.ending = result.ending;
  }

  return nextStory;
}

function validateResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("模型返回为空或格式错误。");
  }

  if (!Array.isArray(result.segments) || result.segments.length === 0) {
    throw new Error("模型返回缺少人生片段。");
  }

  if (!result.state_patch || typeof result.state_patch !== "object") {
    throw new Error("模型返回缺少状态补丁。");
  }

  if (
    result.decision &&
    (!Array.isArray(result.decision.choices) || result.decision.choices.length < 2)
  ) {
    throw new Error("模型返回的决策点格式错误。");
  }
}

function normalizeSegments(segments, result) {
  return segments.map((segment) => ({
    id: crypto.randomUUID(),
    type: segment.type || "narration",
    title: segment.title || result.title || "",
    age_range: segment.age_range || result.age_range || "",
    density: segment.density || result.density || "medium",
    summary: segment.summary || result.summary || "",
    paragraphs: Array.isArray(segment.paragraphs)
      ? segment.paragraphs.filter(Boolean)
      : [segment.content || result.content || ""].filter(Boolean),
  }));
}
