export const AREAS = ["school", "math", "english", "python", "economics"];

export const AREA_LABELS = {
  school: "学校课程",
  math: "数学",
  english: "英语",
  python: "Python",
  economics: "经济学 / AI",
};

const clean = (value) => String(value ?? "").trim().slice(0, 80);

export function makeReview(raw) {
  const entries = Object.fromEntries(AREAS.map((area) => [area, {
    status: ["done", "partial", "missed"].includes(raw?.[area]?.status) ? raw[area].status : null,
    note: clean(raw?.[area]?.note),
  }]));
  if (AREAS.some((area) => !entries[area].status)) {
    throw new Error("请先选择五项学习状态");
  }

  const decisions = [];
  const add = (area, action, text) => decisions.push({ area, action, text });

  if (entries.school.status === "done") {
    add("school", "正常继续", "明天先跟好课程和作业，课后只处理最影响成绩的一项。");
  } else {
    add("school", "顺延 1 项", entries.school.note
      ? `只顺延最影响成绩的一项：${entries.school.note}。`
      : "只顺延最影响近期成绩的一项；明天先从作业、测验和课堂疑问中选出它。");
  }

  if (entries.math.status === "done") {
    add("math", "正常继续", "明天跟课堂进度，闭卷做 1 道相关题，并解释步骤。");
  } else {
    add("math", "缩减", entries.math.note
      ? `只攻克「${entries.math.note}」，做 2–3 道针对题。`
      : "先找出最弱的一个知识点，再做 2–3 道针对题。");
  }

  add("english", "不累积欠账", "明天正常做 10 分钟输入和 60 秒复述，不补双倍。");

  if (entries.python.status === "done") {
    add("python", "正常继续", "有余力时，继续当前练习；先自己写、运行并解释结果。");
  } else {
    add("python", "顺延卡点", entries.python.note
      ? `只接着解决「${entries.python.note}」，不整章重学或赶新内容。`
      : "只接着解决今天真实的编程卡点；先定位卡住的那一步。");
  }

  if (entries.economics.status === "done") {
    add("economics", "按需继续", "明天仅在学校或竞赛确实需要时继续。");
  } else if (raw?.economics?.hasDeadline) {
    add("economics", "按截止处理", entries.economics.note
      ? `有明确截止：明天推进「${entries.economics.note}」的下一小步。`
      : "有明确截止：明天确认截止时间并推进最小可交付的一步。");
  } else {
    add("economics", "取消", "没有明确截止，明天不补做，也不形成学习债。");
  }

  const tomorrow = decisions.slice(0, 3).map((decision, index) => ({
    ...decision,
    number: index + 1,
    title: AREA_LABELS[decision.area],
  }));
  return { entries, decisions, tomorrow };
}
