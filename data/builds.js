window.TOOLMAN_BUILDS = [
  {
    id: "s04-pathfinder-rage-flask-support",
    title: "0.4 药侠追猎者",
    shortTitle: "药侠盛怒药剂",
    season: "0.4",
    className: "游侠",
    ascendancy: "追猎者",
    cost: "中",
    mode: "组队刷图",
    portrait: "./assets/pathfinder.webp",
    status: "只适用于组队",
    tagline: "药剂回复覆盖全队，并稳定给攻击队友喂盛怒。",
    conceptIds: ["presence", "rage", "alchemists-boon", "blood-of-rage", "warlord-berserker", "travellers-wisdom"],
    ratings: {
      offense: 4.5,
      defense: 4,
      special: 5
    },
    quickUse: [
      "保持 [[alchemists-boon|炼金师恩惠]] 开启，让药剂回复覆盖 [[presence|在场]] 队友。",
      "用 [[blood-of-rage|Blood of Rage]] 触发近期获得 [[rage|盛怒]]，再由 [[warlord-berserker|Warlord Berserker]] 给队友每秒 5 盛怒。",
      "不要让自己长期满盛怒；通过副手和双药循环让盛怒持续被消耗或清空。"
    ],
    requiredItems: [
      {
        slot: "腰带",
        dbId: "shavronnes-satchel",
        reason: "药剂生命回复作用于能量护盾，补齐工具人回复轴。"
      },
      {
        slot: "项链",
        label: "四涂油项链",
        icon: "./assets/icons/icon_amulet.png",
        reason: "保证 Blood of Rage 与 Warlord Berserker，剩余涂油补在场范围或移动惩罚减免。"
      },
      {
        slot: "副手组合",
        label: "法器 + 轻盾",
        icon: "./assets/icons/icon_shield.png",
        reason: "配合达到最大盛怒时失去所有盛怒的词缀，避免满盛怒断触发。"
      }
    ],
    gearPlan: [
      "头、鞋优先纯护盾底子，后缀补混沌抗性。",
      "衣服可选全域防御华服，或闪盾衣服后缀偏斜。",
      "主手权杖找友军 increased、在场范围、爆伤；冰/电抗性神殿权杖更契合药侠覆盖。",
      "戒指用裂隙戒指，前缀闪避，后缀补属性点。"
    ],
    passives: [
      {
        title: "普通天赋图",
        image: "",
        note: "把截图放到 assets/passives/pathfinder-tree.png，然后在 builds.js 填 image。"
      },
      {
        title: "升华天赋图",
        image: "",
        note: "优先标出 Traveller's Wisdom 和药剂相关升华。"
      }
    ],
    skills: [
      "炼金师恩惠 - 药草学 II",
      "鬼魂之舞 - 持续时间缩短 II",
      "充能调节",
      "熔岩护盾"
    ],
    warnings: [
      "满盛怒时继续喝药叠盛怒，实战可能不算近期获得盛怒。",
      "队友离开在场范围时，回复和盛怒分享收益都会断。",
      "版本更新时优先检查 Warlord Berserker、Blood of Rage、Traveller's Wisdom。"
    ]
  },
  {
    id: "s04-low-budget-afk-charge-feeder",
    pobImportId: "poe-ninja-ddddddddysira",
    title: "0.4 低造价纯挂机喂球人",
    shortTitle: "挂机喂球人",
    season: "0.4",
    className: "不限",
    ascendancy: "古灵上限最高",
    cost: "低",
    mode: "组队挂机",
    portrait: "./assets/gemling-legionnaire.webp",
    status: "低操作，能手动补球",
    tagline: "稳定生产三色能量球并传给队友，古灵可顺手兼任诅咒师。",
    conceptIds: ["charge", "conduit", "resonance", "redflare-conduit", "serpents-egg", "charge-infusion", "blasphemous-rite"],
    ratings: {
      offense: 4,
      defense: 2.5,
      special: 5
    },
    quickUse: [
      "穿 [[redflare-conduit|赫耀导体]]，让自己在近期没有失去暴击球时每秒获得暴击球。",
      "点 [[conduit|能量连结]]，把自己生产的球传给 [[presence|在场]] 队友，并避免队友把暴击球回传给你。",
      "带 [[serpents-egg|毒蛇之卵]] 放大得球量；需要额外效率时用 [[blasphemous-rite|渎神祭祀]]、骷髅牧师、献祭手动补球。"
    ],
    requiredItems: [
      {
        slot: "衣服",
        dbId: "redflare-conduit",
        reason: "低成本挂机产暴击球的核心。要保证暴击球被传走，避免触发中断。"
      },
      {
        slot: "项链",
        dbId: "serpents-egg",
        reason: "获得能量球时额外获得能量球，中文缓存里有图片和词条。"
      },
      {
        slot: "天赋",
        label: "能量连结",
        icon: "./assets/icons/icon_amulet.png",
        reason: "把自己生产的三色球传给队友，是纯挂机成立的关键。"
      }
    ],
    gearPlan: [
      "其他部位走护盾头、手、鞋，后缀补抗性，鞋子补移速。",
      "通常不用刻意堆很多防御维度；预算允许再补格挡和偏斜。",
      "主手友军增伤权杖，副手法器补护盾和抗性。",
      "兼任诅咒师时，改用全法术等级 +4 的法杖，并在法杖上插灵魂核心。"
    ],
    passives: [
      {
        title: "纯工具人天赋图",
        image: "",
        note: "后续可放 assets/passives/charge-feeder-tree.png。核心标记：能量连结、共鸣取舍、充能相关。"
      },
      {
        title: "兼任诅咒师天赋图",
        image: "",
        note: "参考巫妖诅咒师文档，古灵版本额外标注品质和技能等级收益。"
      }
    ],
    skills: [
      "鬼魂之舞 - 缩短持续时间",
      "充能调节",
      "渎神祭祀 - 充能满盈 II - 缩短持续时间 II - 过剩 II",
      "骷髅牧师 - 布鲁特斯的脑",
      "献祭：没有尸体可用时开启"
    ],
    warnings: [
      "0.4 后共鸣会判定来源，队友传来的球不能通过自身共鸣二次变色。",
      "怪物击中移除全部能量球等词缀会干扰循环；最简单方案是让喂球人永远吃不到暴击球。",
      "献祭召唤物补球不能按太快，否则召唤物全死后会进入重生冷却。",
      "矛系技能或崩雷鸣等大量消耗指定球的队友，可能需要手动补球。"
    ]
  }
];
