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
      recent_chapters: story.chapters.slice(-3),
    },
    null,
    2,
  );
}

export function buildOpeningMessages(story) {
  const worldConfig = getWorldConfig(story.settings.world_type);

  return [
    {
      role: "system",
      content: `
你是一个长线叙事引擎，要为“人生小说生成器”生成长线人生故事。

要求：
1. 玩家前台只能看到小说、摘要和选项，绝不展示数值或属性。
2. 故事要像人生，不像游戏；但后台必须维持强结构状态。
3. 必须严格遵守当前世界配置与世界规则。
4. 绝对避免吃书。已确认事实不能被后文直接推翻。
5. 关系变化必须有过程，重大反转必须有前因。
6. 选项必须体现不同人生姿态，而不是同义改写。
7. 用简体中文输出。
8. 只输出合法 JSON，不要附加解释，不要使用 Markdown 代码块。

当前世界：
- 名称：${worldConfig.label}
- 简述：${worldConfig.pitch}
- 开局指令：${worldConfig.openingInstruction}
- 世界指令：
${worldConfig.promptRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}

输出 JSON 结构：
{
  "title": "本回合标题",
  "summary": "120字内的局势摘要",
  "content": "本回合小说正文",
  "choices": ["选项1", "选项2", "选项3", "选项4"],
  "state_patch": {
    "meta": { "current_turn": 1, "current_stage": "幼年" },
    "world_state": {},
    "protagonist": {},
    "abilities": {},
    "relationships": [],
    "story_memory": {
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
  }
}
`.trim(),
    },
    {
      role: "user",
      content: `
请基于以下开局设定，生成这一局故事的开篇、第一段正文、第一组选择，以及初始状态补丁。

开局设定：
${JSON.stringify(story.settings, null, 2)}

当前世界配置：
${JSON.stringify(
  {
    world_type: worldConfig.id,
    label: worldConfig.label,
    genre: worldConfig.genre,
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
- 正文长度要符合玩家设定的“文本长度偏好”。
- 选项数量固定为 4 个。
`.trim(),
    },
  ];
}

export function buildTurnMessages(story, selectedChoice, interventionIntent) {
  const worldConfig = getWorldConfig(story.settings.world_type);
  const interventionText = interventionIntent
    ? `\n玩家本回合额外提出的主动意图：${interventionIntent}\n请认真回应该意图，但不要把意图直接写成无代价的即时结果。\n注意：本回合已经消耗 1 次主动干预机会，请在 state_patch.intervention_state.available_chances 中返回消耗后的剩余值；如果剧情自然让主角新获得了额外机会，也可以在消耗后的基础上增加。`
    : "";

  return [
    {
      role: "system",
      content: `
你是一个长线叙事引擎，要继续这个长线人生故事。

要求：
1. 必须严格遵守已确认事实、既有关系和当前世界规则。
2. 不要写成摘要堆砌，要写成自然小说段落。
3. 这一回合既要推进故事，也要维持因果和人物弧光。
4. 如果玩家给了主动意图，要尽量顺着诉求写出可执行剧情，但不允许违背既定事实。
5. 如果主角通过成就、关系或社会资本拥有资格，可授予 1 次主动干预机会；否则保持原值。
6. 若已经接近人生后期，可自然开始收束，但不要仓促结束。
7. 只输出合法 JSON，不要附加解释，不要使用 Markdown 代码块。

当前世界：
- 名称：${worldConfig.label}
- 延续指令：${worldConfig.continuationInstruction}
- 世界规则：
${worldConfig.promptRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}

输出 JSON 结构：
{
  "title": "本回合标题",
  "summary": "120字内的局势摘要",
  "content": "本回合小说正文",
  "choices": ["选项1", "选项2", "选项3", "选项4"],
  "state_patch": {
    "meta": { "current_turn": 0, "current_stage": "" },
    "protagonist": {},
    "abilities": {},
    "relationships": [],
    "story_memory": {
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
    "epilogue": "",
    "evaluation": {
      "人生走向": "",
      "主线重心": "",
      "人物弧光": "",
      "关键代价": "",
      "故事完成度": ""
    }
  }
}
`.trim(),
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

玩家本回合选择：
${selectedChoice}
${interventionText}

请继续写下一回合，输出完整 JSON。
`.trim(),
    },
  ];
}
