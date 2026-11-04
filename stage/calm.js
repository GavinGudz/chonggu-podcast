// calm.js —— 新闻访谈插段的引擎（第 8 期 v17 定）：大转折处主讲不说话，只放新闻和采访的原声（配中文字幕），观众不用跟着主讲推理，直接看事情本身。
//   主人：「要有信息量，放松指的是不需要听我的话去思考的放松，最好用上新闻访谈」「风格要变」。三种版式，每段换一种：
//   wall   新闻墙：几个台的画面并排，正在说话的那格亮起来、往前浮，底下慢慢滚一条标题（tick）
//   feed   信息流：一张张新闻卡像刷手机一样慢慢往上划，正在说的那张在正中间
//   cinema 电影感：明亮的整屏画面，慢推，叠化换镜头
//   每段放什么写在 episode.yaml 的 interludes（按章的前缀），工具包里不带任何新闻素材：
//     interludes:
//       wh:                                  # 方向盘那一章开头
//         style: wall
//         title: 方向盘
//         en: WHO STEERS
//         tick: 五角大楼 × Anthropic　｜　最后通牒：周五　｜　   # 只有 wall 用
//         segs:
//           - {clip: cm_wion, c0: .32, aud: w1, d: 3.36, sub: 五角大楼召见 Dario，进行高风险谈判。, src: WION · 2026.2}
//     clip：实拍帧序列（assets/clips/<clip>/，counts*.json 登记）；c0：原声开口时放到这段实拍的第几秒；aud：原声 wav（写名字就是 <aud_dir>/<名>.wav，
//     aud_dir 默认 assets/interludes/aud；写路径就照路径，相对这一期的目录）；d：原声多长；sub：中文字幕；src：左下角出处；
//     br：亮度（cinema）；tail + tailAt：这段原声说到 tailAt 秒时换成另一段实拍
//   也可以写成列表：interludes: [{pre: wh, style: wall, …}]，或者按这一章第一句的 id：[{id: wh01, style: wall, …}]（只写 id、没有 segs 的只留气口，不放插段）。
//   可选 lead（默认 1.8）、pre_gap（.6）、gap（.35）、db（原声音量，默认 -9）。
//   用法（章节文件开头）：const s1 = K.calm ? K.calm(F, X) : X.t0;  —— 在 [X.t0, 返回值) 里登记这一段的镜头、原声、出处，返回值是这一章自己第一镜开始的时刻
//   长度由那一句开口前的气口决定（episode.yaml 的 breath 给这一章第一句留的长停顿），这一章的第一镜在开口前 LEAD 秒接进来。
(() => {
  const RAW = window.EP?.interludes ?? {}, L = Array.isArray(RAW) ? RAW.filter(o => o && typeof o === 'object') : [];
  const SEG = Array.isArray(RAW) ? Object.fromEntries(L.filter(o => o.pre ?? o.chapter).map(o => [o.pre ?? o.chapter, o])) : RAW, BYID = Object.fromEntries(L.filter(o => o.id).map(o => [o.id, o]));
  const audOf = (o, a) => /[\/]|\.wav$/i.test(a) ? a : `${String(o.aud_dir ?? 'assets/interludes/aud').replace(/\/+$/, '')}/${a}.wav`;
  K.calm = (F, X) => {
    const o = SEG[X.pre] ?? BYID[X.first]; if (!o || !o.segs?.length) return X.t0;
    const LEAD = o.lead ?? 1.8, PRE = o.pre_gap ?? .6, GAP = o.gap ?? .35;
    const b = F.T.beats.find(x => x.id === X.first), v = b.vstart ?? b.start, end = v - LEAD;
    if (end - X.t0 < 6) return X.t0;
    const { C, lerp } = K, f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3), SM = x => { x = C(x); return x * x * (3 - 2 * x); };
    // 时间表：每条原声一段，中间留 GAP；最后剩下的时间给章名
    let t = X.t0 + PRE; const S = o.segs.map(s => { const a = t; t += s.d + GAP; return { ...s, a, z: a + s.d }; });
    const tTitle = Math.min(S.at(-1).z + .2, end - 1.2);
    for (const s of S) { if (s.aud) K.aud(s.a, audOf(o, s.aud), o.db ?? -9); if (s.src) K.src(s.a, s.z + GAP, s.src); }
    K.sfx(X.t0 + .05, 'swish', -24);
    const fr = (n, t, c0) => FB.fr(n, Math.max(1, Math.min(FB.CL[n], Math.floor(Math.max(0, t - c0) * 30) + 1)));
    const vid = (s, t) => (s.tail && t >= s.a + s.tailAt) ? fr(s.tail, t, s.a + s.tailAt) : fr(s.clip, t, s.a - s.c0);
    const img = (src, css = '') => `<img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${css}">`;
    const cur = t => S.findIndex(s => t >= s.a - GAP / 2 && t < s.z + GAP / 2);
    const sub = t => { const s = S.find(s => t >= s.a + .1 && t < s.z + .1); return s ? `<div class="sub" style="z-index:91">${s.sub}</div>` : ''; };
    const title = t => { const k = SM((t - tTitle) / .6) * (1 - SM((t - end + .5) / .5)); if (k <= 0) return '';
      return `<div style="position:absolute;left:0;right:0;top:${o.style === 'cinema' ? 440 : 470}px;text-align:center;opacity:${f3(k)};z-index:60">` +
        `<div style="font:300 96px ${K.HAN};letter-spacing:30px;color:#fff;text-shadow:0 4px 40px #000c">${o.title}</div>` +
        `<div style="margin-top:10px;font:400 26px ${K.EN};letter-spacing:12px;color:#ffffffb0">${o.en}</div></div>`; };
    const fadeIn = t => C((t - X.t0) / .5), fadeOut = t => 1 - C((t - end + .45) / .45);

    // 新闻墙：三格并排，说话的那格亮、放大、往前；其余两格压暗；底下一条慢慢滚动的标题
    const wall = t => { const i = cur(t), W = 600, H = 338, gap = 30, x0 = 960 - (3 * W + 2 * gap) / 2;
      let h = `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,#1b2433 0%,#0b0f17 60%,#05070b 100%)"></div>`;
      S.forEach((s, k) => { const on = k === i ? 1 : 0, act = i < 0 ? 0 : SM(1 - Math.abs(t - (s.a + s.d / 2)) / (s.d / 2 + .6));
        const sc = lerp(1, 1.28, act), y = 300 - 30 * act, br = lerp(.42, 1, k === i ? SM((t - s.a + .3) / .3) : 0);
        h += `<div style="position:absolute;left:${f1(x0 + k * (W + gap))}px;top:${f1(y)}px;width:${W}px;height:${H}px;transform:scale(${f3(sc)});z-index:${10 + Math.round(act * 10)};border-radius:10px;overflow:hidden;box-shadow:0 ${f1(20 + 30 * act)}px ${f1(50 + 40 * act)}px #000c;outline:2px solid ${on ? '#ffffff66' : '#ffffff18'};filter:brightness(${f3(br)})">${img(vid(s, Math.max(t, s.a - .3)))}</div>`; });
      const tick = o.tick ?? '';
      if (tick) h += `<div style="position:absolute;left:0;right:0;top:770px;height:58px;background:#c8102ecc;overflow:hidden"><div style="position:absolute;left:${f1(1920 - (t - X.t0) * 110)}px;top:8px;white-space:nowrap;font:600 34px ${K.HAN};color:#fff;letter-spacing:2px">${tick + tick}</div></div>`;
      return h; };
    // 信息流：新闻卡竖着排，整列慢慢往上走，说话的那张停在正中间、最亮
    const feed = t => { const W = 1180, H = 664, step = 760; let pos = 0;
      S.forEach((s, k) => { pos += SM((t - (s.a - .5)) / .8) * (k ? 1 : 0); });   // 第 k 张开说前 .5 秒开始往上滑一格
      let h = `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#e9edf2 0%,#cfd6df 100%)"></div>`;
      S.forEach((s, k) => { const y = 540 - H / 2 + (k - pos) * step, d = Math.abs(k - pos), on = C(1 - d);
        h += `<div style="position:absolute;left:${960 - W / 2}px;top:${f1(y)}px;width:${W}px;height:${H}px;border-radius:26px;overflow:hidden;transform:scale(${f3(lerp(.86, 1, on))});box-shadow:0 30px 80px #0005;filter:blur(${f1(4 * (1 - on))}px) brightness(${f3(lerp(.75, 1, on))})">${img(vid(s, Math.max(t, s.a - .4)))}</div>`; });
      return h; };
    // 电影感：整屏，偏亮偏暖，慢推；换镜头叠化 .5 秒
    const cinema = t => { let h = `<div style="position:absolute;inset:0;background:#000"></div>`;
      S.forEach((s, k) => { const a = k ? s.a - .25 : X.t0, z = k < S.length - 1 ? S[k + 1].a - .25 : end, op = C((t - a) / .5) * (k < S.length - 1 ? 1 - C((t - z) / .5) : 1);
        if (op <= 0) return; const u = C((t - a) / (z - a + .5));
        h += `<div style="position:absolute;inset:0;opacity:${f3(op)}">${img(vid(s, Math.max(t, s.a - .2)), `transform:scale(${f3(1.03 + .07 * u)});filter:brightness(${f3(1.06 * (s.br ?? 1))}) saturate(1.06) contrast(1.02)`)}</div>`; });
      return h + `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#0000 60%,#0005 100%)"></div>`; };

    const draw = { wall, feed, cinema }[o.style ?? 'cinema']; if (!draw) throw Error(`插段 ${X.pre} 的 style「${o.style}」不认识（wall | feed | cinema）`);
    K.seq(X.t0, end, [[X.t0, t => { K._ff = { nohud: true, nopill: true, subband: true };   // subband：底下一条渐暗带，把各台自己的底栏压下去，中文字幕叠在上面看得清
      return `<div style="position:absolute;inset:0;background:#000"></div><div style="position:absolute;inset:0;opacity:${f3(fadeIn(t) * fadeOut(t))}">${draw(t)}${title(t)}</div>${sub(t)}`; }]]);
    return end;
  };
})();
