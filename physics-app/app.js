/* ===== 初高中物理学习 App 核心逻辑 ===== */
const $ = (s, ctx) => (ctx || document).querySelector(s);
const $$ = (s, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(s));

const store = window.store = {
  stage: "c1",
  currentChapter: null,
  currentLesson: null,
  quizList: [],
  quizIdx: 0,
  quizScore: 0,
  answered: false,
  chatMsgs: [],
  errors: [],
  streak: 8,
  totalDone: 156,
  correctRate: 86,
  /* 答题明细：{qid, mod, tag, cid, lv, correct, t} */
  records: [],
  /* 每日练习数：{date: count} */
  daily: {}
};

/* ---------- 能力统计：基于真实答题明细 ---------- */
function abilityStats() {
  const recs = store.records;
  const byMod = {};
  recs.forEach(r => {
    if (!byMod[r.mod]) byMod[r.mod] = { total: 0, right: 0 };
    byMod[r.mod].total++;
    if (r.correct) byMod[r.mod].right++;
  });
  const order = ["力学", "电磁学", "声光基础", "热学", "近代物理"];
  return order.map(m => {
    const d = byMod[m] || { total: 0, right: 0 };
    return { mod: m, total: d.total, right: d.right, rate: d.total ? Math.round(d.right / d.total * 100) : 0 };
  });
}

function weakTags(limit) {
  const map = {};
  store.records.forEach(r => {
    if (r.correct) return;
    if (!map[r.tag]) map[r.tag] = { tag: r.tag, mod: r.mod, total: 0, wrong: 0 };
    map[r.tag].total++;
    map[r.tag].wrong++;
  });
  return Object.values(map).sort((a, b) => b.wrong - a.wrong).slice(0, limit || 6);
}

function refreshAbility() {
  /* 用最近答题情况更新首页/个人中心的概览数字 */
  const r = store.records;
  if (!r.length) return;
  store.totalDone = (store.totalDone || 0) + 0; /* 占位，避免空逻辑 */
  const right = r.filter(x => x.correct).length;
  store.correctRate = Math.round(right / r.length * 100);
  store.totalDone = r.length;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const LV_NAME = { 1: "基础", 2: "进阶", 3: "挑战" };

/* ---------- 工具函数 ---------- */
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

function go(page) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
  $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === page));
  const p = $("#page-" + page); if (p) p.scrollTop = 0;
  store._current = page;
}

function back() { historyBack(); }

/* ---------- 路由：页面间传参 ---------- */
const routes = {
  home: () => renderHome(),
  knowledge: () => renderKnowledge(),
  chapter: (cid) => { store.currentChapter = cid; renderChapter(cid); },
  lesson: (cid) => { store.currentLesson = cid; renderLesson(cid); },
  practice: (cid) => startQuiz(cid ? QUESTIONS.filter(q => q.cid === cid) : null),
  errors: () => renderErrors(),
  profile: () => renderProfile(),
  radar: () => renderRadar(),
  ai: () => renderAI()
};
let historyStack = [];

function navigate(name, param) {
  historyStack.push(store._current || "home");
  routes[name](param);
  go(name);
}
function historyBack() {
  const prev = historyStack.pop() || "home";
  routes[prev]();
  go(prev);
}

/* ---------- 首页 ---------- */
function renderHome() {
  const chaptersByStage = CHAPTERS.reduce((acc, c) => { (acc[c.s] = acc[c.s] || []).push(c); return acc; }, {});
  const stageArr = Object.keys(chaptersByStage);
  const cards = stageArr.map(s => {
    const list = chaptersByStage[s].slice(0, 4);
    return `<div class="card tight">
      <div class="card-head" style="padding:16px 16px 0"><div class="h">${STAGES[s]}</div></div>
      ${list.map((c, i) => `
        <div class="chapter" data-act="chapter" data-cid="${c.id}">
          <div class="num">${String(i + 1).padStart(2, "0")}</div>
          <div class="mid">
            <div class="t">${c.t}</div>
            <div class="bar"><i style="width:${30 + (i * 17) % 60}%"></i></div>
          </div>
          <div class="arrow">›</div>
        </div>`).join("")}
    </div>`;
  }).join("");

  $("#page-home").innerHTML = `
    <div class="content nohead">
      <div class="usercard">
        <div class="streak"><i>🔥</i> 连续学习 ${store.streak} 天</div>
        <div class="hi">下午好，同学</div>
        <div class="name">物理学习助手</div>
        <div class="row">
          <div class="item"><div class="n">${store.totalDone}</div><div class="l">累计练习</div></div>
          <div class="item"><div class="n">${store.correctRate}%</div><div class="l">正确率</div></div>
          <div class="item"><div class="n">12</div><div class="l">待复习</div></div>
        </div>
      </div>

      <div class="search">
        <div class="ico"></div>
        <input placeholder="搜索知识点：牛顿第二定律、浮力、欧姆定律…">
        <div class="hot">🔥 热搜</div>
      </div>

      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">今日任务</div><div class="more">查看</div></div>
        <div style="padding:4px 16px 16px">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-2);margin-bottom:4px"><span>完成 20 道力学练习题</span><span>6 / 20</span></div>
          <div class="pbar"><i style="width:30%"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-2);margin:14px 0 4px"><span>复习「牛顿第二定律」</span><span>未开始</span></div>
          <div class="pbar"><i style="width:0%"></i></div>
        </div>
      </div>

      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">快速入口</div></div>
        <div class="grid4" style="padding:14px 16px">
          ${entry("🧪", "力学实验室", "blue", "lesson:h1-04")}
          ${entry("📝", "同步练习", "mint", "practice:")}
          ${entry("🧠", "知识图谱", "purple", "knowledge")}
          ${entry("💬", "AI 答疑", "orange", "ai")}
        </div>
      </div>

      <div class="card-head"><div class="h">知识体系</div><div class="more">查看全部</div></div>
      ${cards}
    </div>`;

}

function entry(icon, t, cls, act) {
  const bg = { blue: "var(--blue-bg)", mint: "var(--mint-bg)", purple: "var(--purple-bg)", orange: "var(--orange-bg)" }[cls];
  return `<div class="gitem" data-act="${act}">
    <div class="ico" style="background:${bg}">${icon}</div><div class="t">${t}</div></div>`;
}

/* ---------- 知识体系 ---------- */
function renderKnowledge() {
  const stages = Object.keys(STAGES);
  const seg = stages.map((s, i) => `<button data-s="${s}" class="${s === store.stage ? "on" : ""}">${STAGES[s]}</button>`).join("");
  const list = CHAPTERS.filter(c => c.s === store.stage).map((c, i) => `
    <div class="chapter" data-act="chapter" data-cid="${c.id}">
      <div class="num">${String(i + 1).padStart(2, "0")}</div>
      <div class="mid">
        <div class="t">${c.t}</div>
        <div class="b"><span>${c.k.length} 个知识点</span><span>已掌握 ${Math.floor(c.k.length * 0.6)} 个</span></div>
        <div class="bar"><i style="width:${40 + (i * 13) % 55}%"></i></div>
      </div>
      <div class="arrow">›</div>
    </div>`).join("");

  $("#page-knowledge").innerHTML = `
    <div class="content">
      <div class="search">
        <div class="ico"></div><input placeholder="搜索章节或知识点"><div class="hot">中考真题</div>
      </div>
      <div class="seg">${seg}</div>
      <div class="card tight" style="animation:fadeUp .3s">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">${STAGES[store.stage]}</div><div class="more">${CHAPTERS.filter(c => c.s === store.stage).length} 章</div></div>
        ${list}
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">学科模块</div></div>
        <div class="grid4" style="padding:14px 16px">
          ${entry("⚡", "力学", "blue", "knowledge")}
          ${entry("🔌", "电磁学", "orange", "knowledge")}
          ${entry("🌡️", "热学", "mint", "knowledge")}
          ${entry("🌈", "光学", "purple", "knowledge")}
        </div>
      </div>
    </div>`;

  /* 切换学段：在委托内用 data-s 直接改 store.stage 后重绘 */
  $("#page-knowledge").addEventListener("click", e => {
    const seg = e.target.closest(".seg button");
    if (seg && seg.dataset.s) {
      store.stage = seg.dataset.s; renderKnowledge();
      $("#page-knowledge").scrollTop = 0;
    }
  });
}

/* ---------- 章节详情 ---------- */
function renderChapter(cid) {
  const c = CHAPTERS.find(x => x.id === cid);
  if (!c) return;
  const tags = c.k.map((k, i) => `<span class="tag ${i % 3 === 0 ? "mint" : i % 3 === 1 ? "purple" : ""}">${k}</span>`).join("");
  const qs = QUESTIONS.filter(q => q.cid === cid);
  const lesson = LESSONS[cid];
  const lessonCard = lesson ? `<div class="card" style="background:linear-gradient(135deg,#f2f7ff,#eaf2ff);border:1px solid #dce9ff">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:18px">📖</span><span style="font-size:15px;font-weight:700">${lesson.title}</span></div>
    <div style="font-size:13px;color:var(--text-2);margin-bottom:12px">${lesson.intro}</div>
    <button class="btn primary btn-small" data-act="lesson:${cid}" style="padding:9px">开始学习</button>
  </div>` : "";
  const qList = qs.length ? qs.slice(0, 5).map(q => `
    <div class="chapter" data-act="doq" data-qid="${q.id}">
      <div class="num" style="background:var(--mint-bg);color:var(--mint)">${LV_NAME[q.lv][0]}</div>
      <div class="mid"><div class="t" style="font-size:13.5px">${esc(q.q)}</div><div class="b"><span class="tag ${q.lv===1?"mint":q.lv===2?"":""}" style="padding:1px 7px;font-size:10px">${LV_NAME[q.lv]}</span></div></div>
      <div class="arrow">›</div>
    </div>`).join("")
    : `<div class="empty"><div class="e">📚</div><div class="t">该章节习题即将上线<br>先去学习知识点吧</div></div>`;

  $("#page-chapter").innerHTML = `
    <div class="topbar"><div class="back" data-act="back"></div><div><div class="title" style="font-size:17px">${c.t}</div><div class="subtitle">${STAGES[c.s]} · ${c.k.length} 个知识点</div></div><div class="iconbtn"><span style="font-size:16px">⭐</span></div></div>
    <div class="content nohead">
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">章节概览</div></div>
        <div style="padding:14px 16px">
          <div class="stats">
            <div class="stat"><div class="n b">${c.k.length}</div><div class="l">知识点</div></div>
            <div class="stat"><div class="n m">${qs.length}</div><div class="l">练习题</div></div>
            <div class="stat"><div class="n p">${Math.round((40 + c.k.length * 3) % 55 + 30)}%</div><div class="l">掌握度</div></div>
          </div>
          <div class="tags" style="margin-top:14px">${tags}</div>
        </div>
      </div>
      ${lessonCard}
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">章节练习</div><div class="more" data-act="practice:${cid}">全部练习 ›</div></div>
        ${qList}
      </div>
      <button class="btn primary" data-act="practice:${cid}" style="margin-top:-4px">开始本章练习</button>
    </div>`;

  bindChapter();
}

function bindChapter() {
}

/* ---------- 知识点讲解 ---------- */
function renderLesson(cid) {
  const c = CHAPTERS.find(x => x.id === cid);
  const L = LESSONS[cid];
  const qs = QUESTIONS.filter(q => q.cid === cid);
  const qcards = qs.slice(0, 3).map(q => questionCardHtml(q)).join("");

  $("#page-lesson").innerHTML = `
    <div class="topbar"><div class="back" data-act="back"></div><div><div class="title" style="font-size:17px">${L ? L.title : c.t}</div><div class="subtitle">${STAGES[c.s]} · ${c.t}</div></div><div class="iconbtn"><span style="font-size:15px">🔊</span></div></div>
    <div class="content nohead">
      ${L ? `
      <div class="card">
        <div class="kb">
          <h3><span class="tag">核心概念</span></h3>
          <p>${L.intro}</p>
          <div class="formula">${L.formula}</div>
          <div class="note"><i>💡</i><span>${L.note}</span></div>
          <h3><span class="tag">推导过程</span></h3>
          <div class="derivation">${L.derive.map(d => `<div class="step">${esc(d)}</div>`).join("")}</div>
          <h3><span class="tag">要点拆解</span></h3>
          <div class="keypts">${L.keypoints.map((kp, i) => `<div class="kp"><span class="b">${i + 1}</span><span><b>${kp[0]}：</b>${esc(kp[1])}</span></div>`).join("")}</div>
        </div>
      </div>` : ""}
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">典型例题</div><div class="more" data-act="practice:${cid}">更多 ›</div></div>
        ${qcards || `<div class="empty"><div class="e">📝</div><div class="t">该章节暂无例题<br>去练习页看看</div></div>`}
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn ghost" data-act="back" style="flex:1">返回</button>
        <button class="btn primary" data-act="practice:${cid}" style="flex:2">做练习题</button>
      </div>
    </div>`;

  bindQuestionCards($("#page-lesson"));
}

/* ---------- 练习 ---------- */
function startQuiz(listOrCid, singleQid) {
  let list;
  if (singleQid) { list = [QUESTIONS.find(q => q.id === singleQid)]; }
  else if (Array.isArray(listOrCid)) { list = listOrCid.length ? listOrCid : QUESTIONS.slice(); }
  else if (typeof listOrCid === "string") { list = QUESTIONS.filter(q => q.cid === listOrCid); }
  else { list = QUESTIONS.slice(); }
  if (!list || !list.length) { toast("该章节暂无题目"); return; }
  store.quizList = list.sort(() => Math.random() - 0.5);
  store.quizIdx = 0; store.quizScore = 0; store.answered = false;
  renderQuiz();
}

function renderQuiz() {
  const q = store.quizList[store.quizIdx];
  const total = store.quizList.length;
  const pct = Math.round(store.quizIdx / total * 100);
  const chapter = CHAPTERS.find(c => c.id === q.cid);

  $("#page-quiz").innerHTML = `
    <div class="topbar"><div class="back" data-act="back"></div><div><div class="title" style="font-size:16px">智能练习</div><div class="subtitle">${chapter ? STAGES[chapter.s] + " · " + chapter.t : "综合练习"}</div></div><div class="iconbtn"><span style="font-size:14px">⏱️</span></div></div>
    <div class="content nohead">
      <div class="qcard">
        <div class="qhead">
          <span class="lv ${q.lv === 1 ? "easy" : q.lv === 2 ? "mid" : "hard"}">${LV_NAME[q.lv]}</span>
          <span class="pos">第 ${store.quizIdx + 1} 题 / 共 ${total} 题</span>
        </div>
        <div class="qbody">
          <div class="qtxt">${esc(q.q)}</div>
          <div class="opts" id="opts">
            ${q.opts.map((o, i) => `<div class="opt" data-i="${i}"><span class="l">${LETTERS[i]}</span><span class="t">${esc(o)}</span></div>`).join("")}
          </div>
        </div>
        <div class="qfoot" id="qfoot"></div>
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">答题进度</div><div class="more">${store.quizScore} / ${store.quizIdx + (store.answered ? 1 : 0)} 正确</div></div>
        <div style="padding:6px 16px 16px"><div class="pbar"><i style="width:${pct}%"></i></div></div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn ghost" id="prevBtn" style="flex:1" ${store.quizIdx === 0 || !store.answered ? "disabled" : ""}>上一题</button>
        <button class="btn primary" id="nextBtn" style="flex:2" ${store.answered ? "" : "disabled"}>${store.quizIdx === total - 1 ? "查看结果" : "下一题"}</button>
      </div>
    </div>`;

  $$("#page-quiz [data-act='back']")[0].onclick = () => back();
  $$("#opts .opt").forEach(o => o.onclick = () => selectOpt(o));
  $("#prevBtn").onclick = () => { if (store.quizIdx > 0) { store.quizIdx--; store.answered = false; renderQuiz(); } };
  $("#nextBtn").onclick = () => {
    if (!store.answered) return;
    if (store.quizIdx === total - 1) showResult(); else { store.quizIdx++; store.answered = false; renderQuiz(); }
  };
}

function selectOpt(el) {
  if (store.answered) return;
  const i = +el.dataset.i;
  const q = store.quizList[store.quizIdx];
  const correct = i === q.ans;
  store.answered = true;
  if (correct) store.quizScore++; else {
    if (!store.errors.find(e => e.id === q.id)) store.errors.push(q);
  }
  /* 记录明细 */
  const today = new Date();
  const dateKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  store.records.push({ qid: q.id, mod: q.mod, tag: q.tag, cid: q.cid, lv: q.lv, correct, t: Date.now() });
  store.daily[dateKey] = (store.daily[dateKey] || 0) + 1;
  refreshAbility();
  $$("#opts .opt").forEach(o => {
    const oi = +o.dataset.i;
    o.classList.remove("sel");
    if (oi === q.ans) o.classList.add("right");
    else if (oi === i) o.classList.add("wrong");
  });

  const foot = $("#qfoot");
  foot.innerHTML = `
    <div class="aibtn" id="aihint" style="${q.aihint ? "" : "display:none"}">
      <div class="l"><i>🤖</i> AI 提示：${esc(q.aihint)}</div>
      <div class="r">复制</div>
    </div>
    <div class="ans ${correct ? "" : "w"}">
      <div class="h">${correct ? "✅ 回答正确" : "❌ 回答错误"}　正确答案是 ${LETTERS[q.ans]}</div>
      <div>${esc(q.exp)}</div>
    </div>`;
  $("#aihint").onclick = () => { toast("提示已复制"); };

  $("#prevBtn").disabled = store.quizIdx === 0;
  $("#nextBtn").disabled = false;
}

function showResult() {
  const total = store.quizList.length;
  const rate = Math.round(store.quizScore / total * 100);
  const rank = rate >= 90 ? "班级第 1 名 🏆" : rate >= 70 ? "班级前 10%" : rate >= 60 ? "班级中游" : "还需加把劲";

  $("#page-quiz").innerHTML = `
    <div class="topbar"><div class="back" data-act="back"></div><div><div class="title" style="font-size:17px">练习结果</div></div><div class="iconbtn"><span style="font-size:15px">📊</span></div></div>
    <div class="content nohead">
      <div class="card" style="text-align:center;background:linear-gradient(160deg,#f2f7ff,#eaf2ff);border:1px solid #dce9ff">
        <div style="font-size:44px;font-weight:800;color:var(--blue)">${rate}<span style="font-size:22px">%</span></div>
        <div style="font-size:13px;color:var(--text-2);margin-top:4px">本次正确率 · 共 ${total} 题</div>
        <div class="pbar" style="margin:16px 8px 12px"><i style="width:${rate}%"></i></div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <div class="stat" style="flex:1"><div class="n b">${store.quizScore}</div><div class="l">答对</div></div>
          <div class="stat" style="flex:1"><div class="n" style="color:var(--red)">${total - store.quizScore}</div><div class="l">答错</div></div>
          <div class="stat" style="flex:1"><div class="n m">${store.quizList.filter(q => q.lv === 1).length}</div><div class="l">基础题</div></div>
        </div>
        <div style="margin-top:14px;background:var(--orange-bg);border-radius:10px;padding:9px;font-size:13px;color:#a85f1f;font-weight:600">${rank}</div>
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">薄弱知识点</div><div class="more">加入复习计划</div></div>
        <div style="padding:12px 16px">
          ${(() => {
            const w = weakTags(6);
            if (!w.length) return `<div style="font-size:13px;color:var(--text-3)">还没有足够的答题数据，多做几道题就能看到你的薄弱知识点啦～</div>`;
            return w.map(t => `<span class="tag mint" style="margin-bottom:6px">${t.tag} <small style="opacity:.6">${t.wrong}次</small></span>`).join("");
          })()}
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn ghost" id="r-back" style="flex:1">返回</button>
        <button class="btn primary" id="r-again" style="flex:1">再来一组</button>
        <button class="btn ghost" id="r-err" style="flex:1">只看错题</button>
      </div>
    </div>`;

  $("#r-back").onclick = () => back();
  $("#r-again").onclick = () => startQuiz(store.quizList);
  $("#r-err").onclick = () => {
    const wrongs = store.quizList.map((q, i) => ({ q, idx: i }));
    const errSet = new Set();
    store.quizList.forEach((q, i) => {
      const opt = $$("#page-quiz .opt"); /* noop */
    });
    const filtered = store.quizList.filter(q => {
      const idx = store.quizList.indexOf(q);
      return store.errors.includes(q);
    });
    if (store.errors.length) startQuiz(store.errors.slice());
    else toast("本次没有错题，很棒！");
  };
  $$("[data-act='back']")[0].onclick = () => back();
}

/* ---------- 错题本 ---------- */
function renderErrors() {
  const list = store.errors.slice().reverse();
  $("#page-errors").innerHTML = `
    <div class="content">
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">错题统计</div><div class="more">${list.length} 道</div></div>
        <div style="padding:14px 16px">
          <div class="stats">
            <div class="stat"><div class="n b">${list.length}</div><div class="l">总错题</div></div>
            <div class="stat"><div class="n m">${list.filter(q => q.lv === 1).length}</div><div class="l">基础</div></div>
            <div class="stat"><div class="n p">${list.filter(q => q.lv >= 2).length}</div><div class="l">进阶+</div></div>
          </div>
        </div>
      </div>
      ${list.length ? list.map(q => {
        const chapter = CHAPTERS.find(c => c.id === q.cid);
        return `<div class="erritem" data-act="doq" data-qid="${q.id}">
          <div class="eh"><div class="et">${esc(q.q)}</div><span class="ex">${LV_NAME[q.lv]}</span></div>
          <div class="my">我的答案：${LETTERS[q.ans === 0 ? 1 : 0]}　正确答案：${LETTERS[q.ans]}</div>
          <div class="rt">${chapter ? STAGES[chapter.s] + " · " + chapter.t : ""}</div>
        </div>`;
      }).join("") : `<div class="empty"><div class="e">🎉</div><div class="t">还没有错题<br>继续保持，做题时答错的题会自动收录到这里</div></div>`}
      ${list.length ? `<button class="btn ghost" id="clearErr" style="margin-top:4px">清空错题本</button>` : ""}
    </div>
    ${list.length ? `<div class="export-bar">
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">导出复习资料</div><div class="more">${list.length} 道</div></div>
        <div style="padding:14px 16px">
          <div style="font-size:12.5px;color:var(--text-2);margin-bottom:12px">把错题连同正确答案与解析一起导出，方便打印或离线复习。</div>
          <div style="display:flex;gap:10px">
            <button class="btn primary" id="expHtml" style="flex:1">📄 导出网页版</button>
            <button class="btn ghost" id="expTxt" style="flex:1">📋 导出文本版</button>
          </div>
        </div>
      </div>
    </div>` : ""}`;

  $$("#page-errors [data-act='doq']").forEach(el => el.onclick = () => startQuiz(null, el.dataset.qid));
  const ce = $("#clearErr"); if (ce) ce.onclick = () => { store.errors = []; renderErrors(); toast("错题本已清空"); };
  const eh = $("#expHtml"); if (eh) eh.onclick = () => exportErrors("html");
  const et = $("#expTxt"); if (et) et.onclick = () => exportErrors("txt");
}

/* ---------- AI 答疑 ---------- */
function renderAI() {
  if (!store.chatMsgs.length) {
    store.chatMsgs = [
      { who: "bot", t: "你好，我是你的物理 AI 助教 🤖 可以问我任何物理问题，比如「牛顿第二定律怎么用」「浮力题总做错怎么办」，也可以把不会的题拍给我看。" }
    ];
  }
  const msgs = store.chatMsgs.map(m => `<div class="msg ${m.who === "me" ? "me" : ""}"><div class="av">${m.who === "me" ? "我" : "AI"}</div><div class="b">${esc(m.t)}</div></div>`).join("");
  const typing = store.typing ? `<div class="msg typing"><div class="av">AI</div><div class="b"><span></span><span></span><span></span></div></div>` : "";
  $("#page-ai").innerHTML = `
    <div class="topbar"><div style="width:34px"></div><div><div class="title" style="font-size:17px">AI 答疑</div><div class="subtitle">随时提问 · 秒出解析</div></div><div class="iconbtn"><span style="font-size:14px">⋯</span></div></div>
    <div class="content nohead">
      <div class="chat" id="chat">${msgs}${typing}</div>
      <div class="card tight" style="margin-top:14px">
        <div class="card-head" style="padding:14px 16px 0"><div class="h" style="font-size:14px">常见问题</div></div>
        <div style="padding:12px 16px" class="chipbox">
          ${["牛顿第二定律解题步骤", "浮力题总做错怎么办", "欧姆定律怎么变形", "平抛运动如何分解"].map(t => `<span class="chip" data-q="${t}">${t}</span>`).join("")}
        </div>
      </div>
      <div class="inputbar" style="margin-top:14px">
        <span style="font-size:18px">📷</span>
        <input id="aiInput" placeholder="输入你的物理问题…" value="">
        <button class="send" id="aiSend">↑</button>
      </div>
    </div>`;

  const cv = $("#page-ai"); cv.scrollTop = cv.scrollHeight;
  $$("#page-ai .chip").forEach(c => c.onclick = () => askAI(c.dataset.q));
  $("#aiInput").onkeydown = e => { if (e.key === "Enter") askAI($("#aiInput").value); };
  $("#aiSend").onclick = () => askAI($("#aiInput").value);
}

function askAI(q) {
  const text = (q || "").trim();
  if (!text) return;
  store.chatMsgs.push({ who: "me", t: text });
  $("#aiInput").value = "";
  store.typing = true; renderAI();
  setTimeout(() => {
    store.typing = false;
    store.chatMsgs.push({ who: "bot", t: aiAnswer(text) });
    renderAI();
  }, 900);
}

function aiAnswer(q) {
  const map = [
    ["牛顿第二定律", "用牛顿第二定律 F合=ma 解题，按这四步最稳：① 明确研究对象；② 画受力分析图；③ 建坐标系，把不在轴上的力分解；④ 沿每个方向列 F合=ma。记住合力是「同一物体上所有力的矢量和」，别漏掉摩擦力、支持力。"],
    ["浮力", "浮力题核心是三件事：一是认准 F浮=ρ液gV排，浮力只由液体密度和排开体积决定；二是判断沉浮时比较 F浮 与 G；三是液面变化时先看液柱高度怎么变。用「称重法 F浮=G−F拉」测浮力也很常用。"],
    ["欧姆定律", "欧姆定律 I=U/R，用之前先确认三件事都是同一段导体（同体性）。变形 U=IR 算电压，R=U/I 算电阻。注意电阻是导体本身的性质，不随电压电流改变。遇到动态电路，先判断 R 怎么变，再由 I=U/R 判断电流，最后看各元件电压分配。"],
    ["平抛运动", "平抛运动是「水平方向匀速 + 竖直方向自由落体」的合成。落地时间只由高度决定 t=√(2h/g)，与初速度无关；水平位移 x=v₀t，所以初速度越大射程越远。速度方向就是合速度方向，位移方向是两个分位移的合成方向，两者不同。"],
    ["加速度", "加速度描述速度变化的快慢，a=Δv/Δt，方向与速度变化量 Δv 相同。加速度大不代表速度大，只代表速度变化快。判断运动性质看 a 与 v 的方向：同向加速、反向减速；a 恒定就是匀变速运动。"],
    ["受力分析", "受力分析按顺序来最不容易漏：先重力（一定竖直向下）→ 再接触力（弹力、支持力、绳的拉力、压力）→ 最后摩擦力。画完检查：不画不存在的力，不画合力与分力重复，每个力都能找到施力物体。"],
    ["圆周运动", "圆周运动的关键是向心力 F向=mv²/r，它不是一个新性质的力，而是其他力沿半径方向的合力。常见来源：绳的拉力、杆的支持力、摩擦力、重力与弹力的合力。竖直面内圆周在最高点有临界速度，绳模型 vmin=√(gr)，杆模型可以为零。"],
    ["功和能", "做功的两个必要因素：力和沿力方向的位移，W=Fscosθ。功率 P=W/t 表示做功快慢。动能定理 W合=ΔEk 是最常用的工具，它把「过程」和「状态」连起来，特别适合变力或曲线运动。"],
    ["电场", "电场强度 E=F/q 描述电场强弱，方向与正电荷受力方向一致。电场线越密场强越大，沿电场线方向电势降低。电势差 U=W/q，电场力做功 W=qU，正电荷从高电势移向低电势电场力做正功。"],
    ["电磁感应", "电磁感应的核心：磁通量发生变化才产生感应电动势。求大小用 ε=nΔΦ/Δt，求方向用楞次定律——感应电流的效果总是阻碍磁通量的变化。导体棒切割时 ε=BLv，注意 B、L、v 三者两两垂直。"],
    ["动量", "动量 p=mv 是矢量，方向与速度一致。动量定理 I合=Δp 把冲量与动量变化联系起来，适合解决碰撞、打击等短时间作用问题。动量守恒的条件是系统合外力为零，解题时先判断是否满足守恒条件。"],
    ["机械振动", "简谐运动的回复力 F=−kx，加速度 a=−kx/m，总是指向平衡位置。平衡位置处速度最大、加速度为零；最大位移处速度为零、加速度最大。周期由系统本身决定：弹簧振子 T=2π√(m/k)，单摆 T=2π√(L/g)。"]
  ];
  const hit = map.find(([k]) => q.includes(k));
  if (hit) return hit[1];
  return `关于「${q}」，我建议从这几个角度入手：① 先明确涉及的知识点属于哪一部分（力学 / 电磁 / 热学 / 光学）；② 把已知量和待求量列出来，选对公式；③ 注意物理量的方向（矢量的正负号）和单位统一。要不要我帮你找几道同类题练练手？`;
}

/* ---------- 个人中心 ---------- */
function renderProfile() {
  $("#page-profile").innerHTML = `
    <div class="content">
      <div class="usercard">
        <div class="streak"><i>🏫</i> 高二 (3) 班</div>
        <div class="hi">下午好</div>
        <div class="name">我的学习中心</div>
        <div class="row">
          <div class="item"><div class="n">Lv.12</div><div class="l">学习等级</div></div>
          <div class="item"><div class="n">2840</div><div class="l">学力值</div></div>
          <div class="item"><div class="n">${store.streak}</div><div class="l">连续打卡</div></div>
        </div>
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">本周数据</div><div class="more">查看详情</div></div>
        <div style="padding:14px 16px">
          <div class="stats">
            <div class="stat"><div class="n b">${store.correctRate}%</div><div class="l">正确率</div></div>
            <div class="stat"><div class="n m">${store.totalDone}</div><div class="l">练习数</div></div>
            <div class="stat"><div class="n p">${store.streak}</div><div class="l">连续打卡</div></div>
          </div>
          <div style="margin-top:14px;background:var(--orange-bg);border-radius:10px;padding:10px 12px;font-size:12.5px;color:#a85f1f;font-weight:600">🏆 力学位居班级第 3 名，超过 87% 的同学</div>
        </div>
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">学习管理</div></div>
        ${menu("📚", "我的收藏", "32 个知识点", "toast('收藏夹功能即将上线')")}
        ${menu("🎯", "学习计划", "本周目标 6/8 完成", "toast('计划功能即将上线')")}
        ${menu("📈", "能力雷达", "查看 5 大模块掌握度", "radar", true)}
        ${menu("🏆", "成就徽章", "已解锁 18 枚", "toast('成就功能即将上线')")}
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">设置</div></div>
        ${menu("🔔", "学习提醒", "每天 19:00 提醒做题", "toast('提醒功能即将上线')")}
        ${menu("🌙", "深色模式", "跟随系统", "toggleDark()")}
        ${menu("📤", "导出错题复习卷", `${store.errors.length} 道可导出`, "errors")}
        ${menu("💬", "意见反馈", "把你的想法告诉我们", "toast('感谢你的反馈！')")}
      </div>
      <button class="btn ghost" style="margin-top:4px">退出登录</button>
    </div>`;

}

function menu(icon, t, sub, act, clickable) {
  const cls = clickable ? "menu-item" : "";
  const a = act || "";
  return `<div class="chapter ${cls}" data-act="${a}" style="cursor:${clickable ? "pointer" : "default"}"><div class="num" style="background:var(--bg);font-size:16px">${icon}</div><div class="mid"><div class="t">${t}</div><div class="b"><span style="color:var(--text-3)">${sub}</span></div></div><div class="arrow">›</div></div>`;
}

/* ---------- 题目卡（用于讲解页嵌入） ---------- */
function questionCardHtml(q) {
  return `<div class="qcard">
    <div class="qhead"><span class="lv ${q.lv === 1 ? "easy" : q.lv === 2 ? "mid" : "hard"}">${LV_NAME[q.lv]}</span><span class="pos">例题</span></div>
    <div class="qbody">
      <div class="qtxt">${esc(q.q)}</div>
      <div class="opts">
        ${q.opts.map((o, i) => `<div class="opt" data-i="${i}"><span class="l">${LETTERS[i]}</span><span class="t">${esc(o)}</span></div>`).join("")}
      </div>
    </div>
    <div class="qfoot"></div>
  </div>`;
}

function bindQuestionCards(root) {
  const cards = $$(".qcard", root);
  cards.forEach(card => {
    let q = null;
    $$(".qtxt", card).forEach(t => {
      const found = QUESTIONS.find(x => x.q === t.textContent.trim());
      if (found) q = found;
    });
    if (!q) return;
    $$(".opt", card).forEach(o => o.onclick = () => {
      const i = +o.dataset.i;
      if (card.dataset.done) return;
      card.dataset.done = "1";
      const correct = i === q.ans;
      $$(".opt", card).forEach(op => {
        const oi = +op.dataset.i;
        if (oi === q.ans) op.classList.add("right");
        else if (oi === i) op.classList.add("wrong");
      });
      $(".qfoot", card).innerHTML = `<div class="ans ${correct ? "" : "w"}" style="margin-top:12px"><div class="h">${correct ? "✅ 正确" : "❌ 正确答案 " + LETTERS[q.ans]}</div><div>${esc(q.exp)}</div></div>`;
    });
  });
}

/* ---------- 初始化 ---------- */
function init() {
  const tabs = [
    ["home", "🏠", "首页"],
    ["knowledge", "🧠", "知识"],
    ["practice", "📝", "练习"],
    ["ai", "💬", "答疑"],
    ["profile", "👤", "我的"]
  ];
  $("#tabbar").innerHTML = tabs.map(([n, i, t]) => `<div class="tab ${n === "home" ? "on" : ""}" data-tab="${n}"><i>${i}</i><div class="t">${t}</div></div>`).join("");
  $$(".tab").forEach(t => t.onclick = () => {
    historyStack = [];
    if (t.dataset.tab === "practice") { routes.practice(); }
    else { routes[t.dataset.tab](); }
    go(t.dataset.tab);
  });

  /* 事件委托：所有页面内的 [data-act] 统一在这里处理，
     预渲染或后续重绘都不必重复绑定，避免返回/跳转失效。 */
  $("#app").addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el || !el.closest(".page")) return;
    const raw = el.dataset.act;
    const [name, param] = raw.split(":");
    if (name === "back") { back(); return; }
    if (name === "lesson" || name === "chapter" || name === "practice") {
      navigate(name, param || null); return;
    }
    if (name === "doq") { startQuiz(null, param); return; }
    if (name === "radar") { navigate("radar"); return; }
    if (name === "errors") { navigate("errors"); return; }
  });

  loadDemoRecords();
  /* 预渲染全部页面；用 try 隔离，单页出错不影响其他页与首页展示 */
  const pres = ["home", "knowledge", "chapter", "lesson", "errors", "radar", "ai", "profile"];
  pres.forEach(n => {
    try {
      if (n === "chapter" || n === "lesson") routes[n]("h1-04");
      else routes[n]();
    } catch (e) { console.error("[init] 预渲染失败:", n, e); }
  });

  try { navigate("home"); }
  catch (e) { console.error("[init] 首页渲染失败:", e); }
}

/* ---------- 雷达图（纯 SVG，无依赖） ----------
   已拆分为独立页面 page-radar，绘制逻辑见 renderRadarPage()。
   保留 renderRadar 作为外部别名，避免路由引用失效。 */
function renderRadar() { renderRadarPage(); }

function renderRadarPage() {
  const stats = abilityStats();
  const N = stats.length;
  const max = 100;
  const cx = 150, cy = 165, R = 105;
  const pts = stats.map((s, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const r = s.total ? R * s.rate / max : 8;
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang), ang, ...s };
  });

  let grid = "";
  for (let lv = 1; lv <= 4; lv++) {
    const rr = R * lv / 4;
    const ps = stats.map((_, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      return `${cx + rr * Math.cos(ang).toFixed(1)},${cy + rr * Math.sin(ang).toFixed(1)}`;
    }).join(" ");
    grid += `<polygon points="${ps}" fill="none" stroke="#e6ebf3" stroke-width="1"/>`;
  }
  let axes = "", labels = "";
  stats.forEach((s, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / N;
    const tx = cx + (R + 30) * Math.cos(ang), ty = cy + (R + 22) * Math.sin(ang);
    const x2 = cx + R * Math.cos(ang), y2 = cy + R * Math.sin(ang);
    axes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#e6ebf3" stroke-width="1"/>`;
    const anchor = Math.abs(Math.cos(ang)) < 0.3 ? "middle" : (Math.cos(ang) > 0 ? "start" : "end");
    const baseline = Math.abs(Math.sin(ang)) < 0.3 ? "central" : (Math.sin(ang) > 0 ? "hanging" : "auto");
    labels += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="12.5" fill="#3d4a5c" font-weight="600" text-anchor="${anchor}" dominant-baseline="${baseline}">${s.mod}</text>`;
  });
  const dataStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const overall = stats.length ? Math.round(stats.reduce((a, s) => a + s.rate, 0) / stats.filter(s => s.total).length || 0) : 0;
  const eval_ = overall >= 85 ? "学霸级 · 全面开花 🌟" : overall >= 70 ? "稳扎稳打 · 均衡发力 💪" : overall >= 55 ? "正在突破 · 重点补弱 📈" : "基础阶段 · 持续积累 🌱";

  $("#page-radar").innerHTML = `
    <div class="topbar"><div class="back" data-act="back"></div><div><div class="title" style="font-size:17px">能力雷达</div><div class="subtitle">5 大知识模块掌握度</div></div><div class="iconbtn"><span style="font-size:14px">📊</span></div></div>
    <div class="content nohead">
      <div class="card" style="text-align:center;background:linear-gradient(160deg,#f4f8ff,#eaf1ff);border:1px solid #dce9ff">
        <div style="font-size:38px;font-weight:800;color:var(--blue)">${overall}<span style="font-size:18px">%</span></div>
        <div style="font-size:12.5px;color:var(--text-2);margin-top:2px">综合掌握度（仅统计已作答模块）</div>
        <div style="margin-top:10px;background:var(--orange-bg);border-radius:10px;padding:9px;font-size:13px;color:#a85f1f;font-weight:600">${eval_}</div>
      </div>
      <div class="card tight" style="padding:6px 4px 12px;text-align:center">
        <svg viewBox="0 0 300 300" width="100%" height="300" style="display:block;margin:0 auto;max-width:320px">
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#3b6ef6" stop-opacity="0.42"/>
              <stop offset="100%" stop-color="#5aa8ff" stop-opacity="0.18"/>
            </linearGradient>
          </defs>
          ${grid}${axes}
          <polygon points="${dataStr}" fill="url(#radarFill)" stroke="#3b6ef6" stroke-width="2"/>
          ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.6" fill="#fff" stroke="#3b6ef6" stroke-width="2"/>`).join("")}
          ${pts.map(p => {
            const tx = cx + (R + 8) * Math.cos(p.ang), ty = cy + (R + 8) * Math.sin(p.ang);
            return `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="10.5" fill="#7a8699" text-anchor="middle" dominant-baseline="central">${p.rate}%</text>`;
          }).join("")}
          ${labels}
        </svg>
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">各模块明细</div><div class="more">基于真实答题</div></div>
        <div style="padding:6px 16px 12px">
          ${stats.map(s => {
            const w = s.total ? s.rate : 0;
            return `<div style="padding:8px 0;border-bottom:1px solid #f2f4f8;display:flex;align-items:center;gap:10px">
              <div style="width:56px;font-size:13px;font-weight:600;color:#3d4a5c">${s.mod}</div>
              <div style="flex:1"><div class="pbar" style="height:7px"><i style="width:${w}%;background:${s.total ? "linear-gradient(90deg,#3b6ef6,#5aa8ff)" : "#e3e9f3"}"></i></div></div>
              <div style="width:78px;text-align:right;font-size:12px;color:var(--text-2)">${s.total ? s.right + "/" + s.total + " 题" : "尚未作答"}</div>
              <div style="width:44px;text-align:right;font-size:14px;font-weight:700;color:var(--blue)">${s.total ? s.rate + "%" : "—"}</div>
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="card tight">
        <div class="card-head" style="padding:16px 16px 0"><div class="h">提升建议</div></div>
        <div style="padding:12px 16px;font-size:13px;color:#5a6a7c;line-height:1.7">
          ${(() => {
            const weak = stats.filter(s => s.total && s.rate < 70).sort((a, b) => a.rate - b.rate);
            if (!weak.length) return "你的各模块表现都很均衡，可以挑战更高难度的综合题，或尝试限时训练来提速。";
            return "建议优先攻克 <b>" + weak.slice(0, 2).map(s => s.mod).join("、") + "</b> 模块，多做基础题巩固公式，再逐步提升难度。每做完一组题回来刷新雷达图，能看到掌握度稳步上升。";
          })()}
        </div>
      </div>
    </div>`;
}

/* ---------- 错题导出 ---------- */
function exportErrors(fmt) {
  const list = store.errors.slice().reverse();
  if (!list.length) { toast("错题本为空，没有可导出的内容"); return; }
  const lines = [];
  lines.push("物理学习助手 · 错题复习卷");
  lines.push("生成时间：" + new Date().toLocaleString("zh-CN"));
  lines.push("共 " + list.length + " 道错题");
  lines.push("");
  list.forEach((q, i) => {
    const chapter = CHAPTERS.find(c => c.id === q.cid);
    lines.push("【第 " + (i + 1) + " 题】" + STAGES[chapter.s] + " · " + chapter.t + "（" + LV_NAME[q.lv] + "）");
    lines.push(q.q);
    q.opts.forEach((o, j) => lines.push("  " + LETTERS[j] + ". " + o));
    lines.push("✅ 正确答案：" + LETTERS[q.ans]);
    lines.push("📖 解析：" + q.exp);
    if (q.aihint) lines.push("💡 提示：" + q.aihint);
    lines.push("");
  });
  lines.push("—— 坚持练习，错题会变成你的加分项 ——");

  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: fmt === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fmt === "html"
    ? "物理错题复习卷_" + new Date().toISOString().slice(0, 10) + ".html"
    : "物理错题复习卷_" + new Date().toISOString().slice(0, 10) + ".txt";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast("已导出 " + list.length + " 道错题");
}

/* ---------- 深色模式 ---------- */
function toggleDark() {
  document.body.classList.toggle("dark");
  const on = document.body.classList.contains("dark");
  toast(on ? "已切换到深色模式" : "已切换回浅色模式");
}

/* ---------- 示例答题数据（演示用，可删） ---------- */
function loadDemoRecords() {
  if (store.records.length) return;
  const seed = [
    ["q001", 1], ["q002", 1], ["q003", 0], ["q004", 1], ["q005", 1],
    ["q006", 1], ["q007", 1], ["q008", 0], ["q011", 1], ["q012", 1],
    ["q013", 1], ["q014", 1], ["q015", 0], ["q016", 1], ["q017", 1],
    ["q018", 1], ["q019", 0], ["q020", 1], ["q021", 1], ["q022", 1],
    ["q023", 1], ["q024", 1], ["q025", 0], ["q026", 1], ["q027", 1],
    ["q028", 1], ["q029", 0], ["q030", 1], ["q031", 1], ["q032", 1],
    ["q033", 1], ["q034", 1], ["q035", 0], ["q036", 1], ["q037", 1],
    ["q038", 1], ["q039", 1], ["q040", 0], ["q041", 1], ["q042", 1],
    ["q043", 1], ["q044", 0], ["q045", 1], ["q046", 1], ["q047", 1],
    ["q048", 1], ["q049", 0], ["q050", 1], ["q051", 1], ["q052", 1],
    ["q053", 1], ["q054", 1], ["q055", 0], ["q056", 1], ["q057", 1],
    ["q058", 1], ["q059", 0], ["q060", 1], ["q061", 1], ["q062", 1],
    ["q063", 1], ["q064", 0], ["q065", 1]
  ];
  seed.forEach(([id, ok], i) => {
    const q = QUESTIONS.find(x => x.id === id);
    if (!q) return;
    store.records.push({ qid: q.id, mod: q.mod, tag: q.tag, cid: q.cid, lv: q.lv, correct: !!ok, t: Date.now() - (seed.length - i) * 86400000 });
    const d = new Date(Date.now() - (seed.length - i) * 86400000);
    const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    store.daily[k] = (store.daily[k] || 0) + 1;
  });
  /* 同步到错题本 */
  seed.forEach(([id, ok]) => {
    if (!ok) {
      const q = QUESTIONS.find(x => x.id === id);
      if (q && !store.errors.find(e => e.id === q.id)) store.errors.push(q);
    }
  });
  refreshAbility();
}

document.addEventListener("DOMContentLoaded", init);
