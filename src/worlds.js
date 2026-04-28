export const WORLD_CONFIGS = {
  modern_city: {
    id: "modern_city",
    label: "现代都市",
    genre: "现代都市",
    pitch: "一个以现实社会逻辑为主的人生故事世界。",
    openingInstruction:
      "当前启用的世界是现代都市。请围绕现实社会、家庭、教育、阶层、行业机会、人际关系来构建主角人生。",
    continuationInstruction:
      "继续这个现代都市人生故事。保持现实社会逻辑成立，冲突应主要来自家庭、成长、竞争、关系、资源与时代机会。",
    promptRules: [
      "默认是写实现代都市，不允许无铺垫的超常展开。",
      "允许出现都市传闻、神秘学兴趣或异常线索，但只有在前文已有充分承接时，才能逐步扩展出隐藏层世界。",
      "事业、感情、家庭、教育、阶层与人脉是主要冲突来源。",
    ],
    worldRules: [
      "默认是写实现代都市，不允许无铺垫的超常展开。",
      "重大关系变化必须有前因后果。",
      "已确认事实不能被后续正文直接推翻。",
    ],
    stateDefaults: {
      competition_level: "",
      mobility_level: "",
      hidden_supernatural_seed: false,
    },
  },
};

export function getWorldConfig(worldType = "modern_city") {
  return WORLD_CONFIGS[worldType] ?? WORLD_CONFIGS.modern_city;
}
