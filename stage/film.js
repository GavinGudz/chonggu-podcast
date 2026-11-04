// 全片总装（第 8 期 v9 定型）：读时间线，按章调 ch/*.js，每帧叠上常驻的东西（章节小标签、台标、出处、颗粒）。
// 章节文件：CH.push({ name: '钱：多能赚', build: (F, K, X) => { … K.seq(X.t0, X.t1, [[X.t0, t => …], …]) } })；X = {name, pre, idx, t0, t1, first, last, branch, meta}
// 这一期的设置（章节、树枝、片名卡、插段……）都在 window.EP 里，chonggu render 从 episode.yaml 生成、写进 index.html，这里不写死任何一期的东西。
//   EP.chapters [{pre, name, file, branch, label, meta}]；EP.branches {money: '钱'}（树枝 → 小标签；也可以写 {label: '钱', pal: 'money'} 换配色）；EP.counts / EP.boxes：这一期有的实拍登记表和文件截图框
window.CH = window.CH || [];
window.ready = (async () => {
  const EP = window.EP ?? {}, SHOW = EP.show ?? '重估';
  // 章名 → [树枝（配色）, 小标签]：章节没写 branch 就不显示左上角的小标签
  const BR = {};
  for (const c of EP.chapters ?? []) { if (!c.branch) continue; const b = EP.branches?.[c.branch]; BR[c.name] = [(typeof b === 'object' && b?.pal) || c.branch, c.label ?? (typeof b === 'string' ? b : b?.label) ?? c.branch]; }
  const F = await FB.init({ counts: EP.counts ?? [], preload: [], fonts: ['150px Num', '700 60px "Noto Sans SC"', '900 60px SkinHei', '500 56px "Noto Sans SC"', '600 30px Montserrat', '40px "Noto Serif SC"'], subMax: EP.sub_max ?? 22 });
  await new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = 'skin/grain.png'; });
  FB.S1BOX = {}; for (const f of EP.boxes ?? []) Object.assign(FB.S1BOX, await fetch(f).then(r => r.json()).catch(() => ({})));
  FB.SOURCES = { tags: {}, beats: {} };
  K.AUD = []; K.aud = (t, file, db = -12) => { K.AUD.push([+(+t).toFixed(3), file, db]); };   // 原声：混音时放进去，音乐让开
  K._bind((a, b, f) => F.shot(a, b, t => { K._ff = {}; return f(t); }));
  const T = F.T, META = Object.fromEntries((EP.chapters ?? []).map(c => [c.name, c]));
  for (const c of T.chapters) {
    const E = META[c.name] ?? {}, X = { ...c, meta: { eb: '', en: '', bg: EP.default_bg ?? null, ...(E.meta ?? {}) }, branch: BR[c.name]?.[0] ?? E.branch }, ch = CH.find(x => x.name === c.name);
    try { if (!ch) throw Error('（这一章还没做）'); ch.build(F, K, X); } catch (e) { if (ch) console.error(`章节 ${c.name} 出错：${e.message}`); placeholder(X, ch ? e.message : '（这一章还没做）'); }
  }
  function placeholder(X, msg) {
    K.seq(X.t0, X.t1, [[X.t0, t => { let cam = { x: 1300, y: 2600, s: .3, rx: 45, rz: -8 }; try { const n = K.tN('br_' + X.branch); cam = { x: n.x, y: n.y + 300, s: .7, rx: 42, rz: -6 }; } catch (e) {}
      return K.treeView(t, cam) + `<div style="position:absolute;left:0;right:0;top:420px;text-align:center;font:700 90px ${K.HAN};color:#ffffff88">${X.name}</div><div style="position:absolute;left:0;right:0;top:540px;text-align:center;font:500 30px ${K.SANS};color:#ffffff66">${msg}</div>`; }]]);
  }
  const chAt = t => T.chapters.find(c => t >= c.t0 && t < c.t1) ?? T.chapters.at(-1);
  const inWin = (W, t) => W.find(([a, b]) => t >= a && t < b);
  return F.go({ frame: h => { const t = FB.cur.t, ff = K._ff ?? {}, c = chAt(t); let hud = K.grain;
    if (ff.subband) hud += `<div style="position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(180deg,#0000,#000c 55%,#000e);z-index:85"></div>`;
    const s = inWin(K.SRC, t); if (s && s[2] && !ff.nosrc) hud += `<div style="position:absolute;left:56px;top:1020px;font:500 34px ${K.SANS};letter-spacing:1px;color:#ffffffc8;text-shadow:0 2px 8px #000;z-index:86">${s[2]}</div>`;
    if (!ff.nopill) hud += `<div style="position:absolute;right:70px;top:48px;font:700 30px ${K.HAN};letter-spacing:6px;color:${K.GOLD};background:#0d1016d0;border:1.5px solid ${K.GOLD}99;padding:6px 14px 6px 20px;border-radius:6px;z-index:87">${SHOW}</div>`;
    const b = BR[c?.name]; if (b && !ff.nohud) { const pal = K.PAL[b[0]] ?? K.PAL.grey; hud += `<div style="position:absolute;left:70px;top:48px;display:flex;align-items:center;gap:12px;z-index:87;background:#0d1016d0;border:1.5px solid ${pal.edge}99;border-radius:6px;padding:6px 18px"><div style="width:12px;height:12px;border-radius:3px;background:${pal.edge}"></div><div style="font:700 28px ${K.HAN};letter-spacing:4px;color:${pal.edge}">${b[1]}</div></div>`; }
    return `<div style="position:absolute;inset:0;overflow:hidden">${h}</div>${hud}`; } });
})();
