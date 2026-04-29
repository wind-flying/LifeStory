import { getWorldConfig } from "./worlds.js";

function serializeState(story) {
  return JSON.stringify(
    {
      meta: story.meta,
      settings: story.settings,
      world_state: story.world_state,
      protagonist: story.protagonist,
      abilities: story.abilities,
      relationships: story.relationships,
      story_memory: story.story_memory,
      intervention_state: story.intervention_state,
      recent_segments: (story.segments ?? []).slice(-4),
      current_decision: story.current_decision,
    },
    null,
    2,
  );
}

function outputSchema(includeSelectedChoice = false) {
  return `
{
  "mode": "continue_narration",
  "title": "本批人生片段的标题",
  "age_range": "例如 3-9岁；长寿世界可用更大跨度",
  "density": "medium",
  "summary": "120字内的前台局势简述",
  ${includeSelectedChoice ? '"selected_choice": "玩家刚刚选择的选项原文",' : '"selected_choice": null,'}
  "segments": [
    {
      "type": "narration",
      "title": "可为空",
      "age_range": "本片段覆盖的时间",
      "density": "medium",
      "summary": "给系统和导出用的短摘要",
      "paragraphs": ["段落1", "段落2"]
    }
  ],
  "decision": {
    "prompt": "关键节点问题",
    "choices": ["选项1", "选项2", "选项3", "选项4"],
    "decision_reason": "为什么此处需要玩家决策"
  },
  "state_patch": {
    "meta": { "current_turn": 1, "current_stage": "幼年" },
    "world_state": {},
    "protagonist": {},
    "abilities": {},
    "relationships": [],
    "story_memory": {
      "long_summary": "截至目前的人生长期摘要",
      "recent_summary": "最近几段的承接摘要，供下次生成直接衔接",
      "confirmed_facts": [],
      "major_events": [],
      "open_threads": [],
      "foreshadowing": [],
      "resolved_threads": [],
      "forbidden_conflicts": []
    },
    "intervention_state": {
      "available_chances": 0,
      "earned_sources": [],
      "pending_intent": null,
      "past_interventions": []
    }
  },
  "end_story": false,
  "ending": {
    "epilogue": "结局正文",
    "evaluation": {
      "人生走向": "",
      "主线重心": "",
      "人物弧光": "",
      "关键代价": "",
      "故事完成度": ""
    }
  }
}
`.trim();
}

function commonRules(worldConfig) {
  return `
你是一个长线叙事引擎，要为“人生小说生成器”生成可滚动阅读的人生文本。

核心要求：
1. 玩家前台只能看到小说、必要的选择和少量状态提示，绝不展示隐藏属性。
2. 故事平时应自然推进，只有在真正影响长期人生方向的关键节点才给玩家选择。
3. 信息密度决定时间跨度。低密度可以跨多年，高密度要细写一个事件或一段关系变化。
4. 可以逐岁推进人生内部时间线，但不要每一岁都强制玩家选择。
5. 必须严格遵守当前世界配置、已确认事实、既有关系和禁止冲突项。
6. 绝对避免吃书。关系、婚姻、组织身份、重大失败、死亡与长期承诺都不能被后文直接推翻。
7. 每次生成都要更新 long_summary 和 recent_summary，让后续文本能自然承接。
8. 如果要反转，必须能从前文事实、伏笔或人物动机中找到依据。
9. 用简体中文输出。只输出合法 JSON，不要附加解释，不要使用 Markdown 代码块。
10. mode 只能是 continue_narration、decision_point、ending。没有关键选择时，decision 必须返回 null。没有结局时，ending 必须返回 null。

决策密度原则：
- 长期路线、亲密关系、事业身份、价值观和重大风险改变时，应进入 decision_point。
- 平稳成长、常规学习、日常积累、普通修行或工作沉淀，可以 continue_narration。
- 连续多个片段没有选择时，要保证故事仍有推进和变化。
- 连续选择不宜过密，除非当前正处在高密度危机或人生分岔。

当前世界：
- 名称：${worldConfig.label}
- 简述：${worldConfig.pitch}
- 世界指令：
${worldConfig.promptRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}
`.trim();
}

export function buildOpeningMessages(story) {
  const worldConfig = getWorldConfig(story.settings.world_type);

  return [
    {
      role: "system",
      content: `${commonRules(worldConfig)}

输出 JSON 结构：
${outputSchema(false)}`,
    },
    {
      role: "user",
      content: `
请基于以下开局设定，生成这一局故事的开篇人生流。

开局设定：
${JSON.stringify(story.settings, null, 2)}

当前世界配置：
${JSON.stringify(
  {
    world_type: worldConfig.id,
    label: worldConfig.label,
    genre: worldConfig.genre,
    opening_instruction: worldConfig.openingInstruction,
    prompt_rules: worldConfig.promptRules,
    world_rules: worldConfig.worldRules,
  },
  null,
  2,
)}

补充要求：
- 主角姓名可由你生成。
- 必须符合当前世界配置，不要擅自切换题材。
- 初始人物控制在 3 到 5 个。
- 第一批文本可以覆盖出生到幼年或少年早期，具体跨度由信息密度决定。
- 如果开篇已经走到真正的人生分岔，再给 decision；否则 decision 返回 null。
- segments 至少 1 个，paragraphs 总量建议 3 到 8 段。
`.trim(),
    },
  ];
}

export function buildTurnMessages(story, selectedChoice, interventionIntent) {
  const worldConfig = getWorldConfig(story.settings.world_type);
  const selectedChoiceText = selectedChoice
    ? `\n玩家刚刚在关键节点做出的选择：${selectedChoice}`
    : "\n玩家没有新选择，本次应继续推进人生流。";
  const interventionText = interventionIntent
    ? `\n玩家本回合额外提出的主动意图：${interventionIntent}\n请认真回应该意图，但不要把意图直接写成无代价的即时结果。本回合已消耗 1 次主动干预机会，请在 state_patch.intervention_state.available_chances 中返回消耗后的剩余值。`
    : "";

  return [
    {
      role: "system",
      content: `${commonRules(worldConfig)}

输出 JSON 结构：
${outputSchema(Boolean(selectedChoice))}`,
    },
    {
      role: "user",
      content: `
当前状态如下：
${serializeState(story)}

当前世界配置：
${JSON.stringify(
  {
    world_type: worldConfig.id,
    label: worldConfig.label,
    genre: worldConfig.genre,
    continuation_instruction: worldConfig.continuationInstruction,
    prompt_rules: worldConfig.promptRules,
    world_rules: worldConfig.worldRules,
  },
  null,
  2,
)}
${selectedChoiceText}
${interventionText}

请继续生成下一批人生片段。必须承接 story_memory.long_summary 和 story_memory.recent_summary，不要重述全部前文。
`.trim(),
    },
  ];
}
