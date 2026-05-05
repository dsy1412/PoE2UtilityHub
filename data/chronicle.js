window.POE2_CHRONICLE = [
  {
    id: "presence",
    name: "Presence / 在场",
    group: "范围",
    summary: "角色周围应用队伍效果的区域，默认半径约 4 米。Presence Area 会改变它，普通 Skill Area 不会改变它。",
    source: "PoE2DB",
    sourceUrl: "https://poe2db.tw/us/Presence",
    related: ["alchemists-boon", "warlord-berserker", "conduit"]
  },
  {
    id: "rage",
    name: "Rage / 盛怒",
    group: "资源",
    summary: "攻击队友很吃的战斗资源。工具人常见价值是帮助队友维持盛怒，而不是自己消耗盛怒打输出。",
    source: "PoE2DB",
    sourceUrl: "https://poe2db.tw/us/Rage",
    related: ["blood-of-rage", "warlord-berserker", "hateforge"]
  },
  {
    id: "blood-of-rage",
    name: "Blood of Rage",
    group: "天赋",
    summary: "使用生命药剂获得 8 盛怒。药侠盛怒工具人的启动点。",
    source: "PoB 0.4 tree.json",
    sourceUrl: "../Path of Building Community (PoE2)/TreeData/0_4/tree.json",
    related: ["rage", "warlord-berserker"]
  },
  {
    id: "warlord-berserker",
    name: "Warlord Berserker",
    group: "天赋",
    summary: "如果你近期获得盛怒，在场友军每秒回复 5 盛怒，但会缩小在场范围。",
    source: "PoE2DB",
    sourceUrl: "https://poe2db.tw/us/Warlord_Berserker",
    related: ["presence", "rage", "blood-of-rage"]
  },
  {
    id: "travellers-wisdom",
    name: "Traveller's Wisdom",
    group: "升华",
    summary: "0.4 药侠关键升华。属性点可改为伤害、防御或消耗效率，是药侠不靠力转盾也能堆坦度的原因。",
    source: "PoB 0.4 tree.json",
    sourceUrl: "../Path of Building Community (PoE2)/TreeData/0_4/tree.json",
    related: ["presence"]
  },
  {
    id: "alchemists-boon",
    name: "Alchemist's Boon / 炼金师恩惠",
    group: "技能",
    summary: "让生命和魔力药剂回复也作用于在场友军，是药侠回复工具人的技能底座。",
    source: "PoB Data/Skills/act_dex.lua",
    sourceUrl: "../Path of Building Community (PoE2)/Data/Skills/act_dex.lua",
    related: ["presence", "shavronnes-satchel"]
  },
  {
    id: "charge",
    name: "能量球",
    group: "资源",
    summary: "耐力球、狂怒球、暴击球三色资源。喂球人的核心就是稳定生产、传递和避免错误回流。",
    source: "PoE2DB",
    sourceUrl: "https://poe2db.tw/cn/Unique_item",
    related: ["conduit", "resonance", "redflare-conduit", "serpents-egg"]
  },
  {
    id: "conduit",
    name: "Conduit / 能量连结",
    group: "天赋",
    summary: "如果你会获得能量球，改为让在场友军获得。喂球人借它把自己生产的球全部传走。",
    source: "PoB 0.4 tree.json",
    sourceUrl: "../Path of Building Community (PoE2)/TreeData/0_4/tree.json",
    related: ["charge", "presence", "resonance"]
  },
  {
    id: "resonance",
    name: "Resonance / 共鸣",
    group: "天赋",
    summary: "0.4 后会判定能量球来源。只有自己生产的球能通过自身共鸣变色，队友传来的球不能二次变色。",
    source: "0.4 实战记录",
    sourceUrl: "",
    related: ["charge", "conduit"]
  },
  {
    id: "redflare-conduit",
    name: "赫耀导体",
    group: "暗金",
    summary: "喂球人的核心衣服。若近期没有失去暴击球则每秒获得暴击球；通过能量连结传走暴击球可维持触发。",
    source: "PoE2DB",
    sourceUrl: "https://poe2db.tw/cn/Redflare_Conduit",
    related: ["charge", "conduit"]
  },
  {
    id: "serpents-egg",
    name: "毒蛇之卵",
    group: "暗金",
    summary: "获得能量球时额外获得能量球。中文暗金缓存中可直接调用图片和词条。",
    source: "PoE2DB",
    sourceUrl: "https://poe2db.tw/cn/Serpents_Egg",
    related: ["charge", "redflare-conduit"]
  },
  {
    id: "charge-infusion",
    name: "充能调节",
    group: "技能",
    summary: "消耗能量球换取收益。0.4 中消耗狂怒球获得技能速度从 more 改为 25% increased，耐力球和暴击球效果不变。",
    source: "0.4 实战记录",
    sourceUrl: "",
    related: ["charge"]
  },
  {
    id: "blasphemous-rite",
    name: "渎神祭祀",
    group: "技能",
    summary: "手动补球方案之一，配合充能满盈、缩短持续时间、过剩等辅助提高球生产。",
    source: "0.4 实战记录",
    sourceUrl: "",
    related: ["charge", "resonance"]
  },
  {
    id: "passive-template",
    name: "天赋图模板",
    group: "维护",
    summary: "每个工具人都预留普通天赋图和升华天赋图位置。你后续只要把截图放进 assets/passives 并在 builds.js 填路径。",
    source: "本站模板",
    sourceUrl: "",
    related: []
  }
];
