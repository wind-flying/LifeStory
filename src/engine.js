import { requestStoryJson } from "./llm.js";
import { buildOpeningMessages, buildTurnMessages } from "./prompts.js";
import { mergeStoryState } from "./state.js";

export async function generateOpening(story, apiSettings) {
  const result = await requestStoryJson(apiSettings, buildOpeningMessages(story));
  return applyModelResult(story, result);
}

export async function generateNextTurn(story, apiSettings, selectedChoice, interventionIntent) {
  const result = await requestStoryJson(
    apiSettings,
    buildTurnMessages(story, selectedChoice, interventionIntent),
  );
  return applyModelResult(story, result);
}

function applyModelResult(story, result) {
  validateResult(result);

  const chapter = {
    title: result.title,
    summary: result.summary,
    content: result.content,
    choices: result.choices,
  };

  let nextStory = mergeStoryState(story, result.state_patch);
  nextStory.current_scene = chapter;
  nextStory.chapters = [...nextStory.chapters, chapter];

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

  if (!result.title || !result.summary || !result.content) {
    throw new Error("模型返回缺少标题、摘要或正文。");
  }

  if (!Array.isArray(result.choices) || result.choices.length !== 4) {
    throw new Error("模型返回的选项数量不为 4。");
  }

  if (!result.state_patch || typeof result.state_patch !== "object") {
    throw new Error("模型返回缺少状态补丁。");
  }
}
