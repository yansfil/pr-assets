// Task / Agents / Graph view exploration boards.
// Run: node agents/runs/task-agent-graph-views/design/build.mjs <out.pen>
import fs from 'node:fs';
import path from 'node:path';
import {readTokens} from '../../../../scripts/gen-tokens.mjs';
import {readLocalVariables} from '../../../../scripts/pen-screens.mjs';
import {loadCanvas} from '../../../../scripts/pen-tokens.mjs';
import {frame, icon, num, text, BUTTON_VARIANTS} from '../../../../scripts/pen-system.mjs';

const root = process.cwd();
const out = process.argv[2];
const tokens = readTokens(root);
const library = loadCanvas(root).document;
const ALIAS = 'hideui';
const TOKEN = /^\$--[A-Za-z0-9_-]+$/;
const art = provider => path.relative(path.dirname(path.resolve(out)), path.join(root, `web/src/assets/agent-${provider}.png`));

function findLib(node, id) {
  if (node && typeof node === 'object') {
    if (node.id === id) return node;
    for (const child of node.children ?? []) { const hit = findLib(child, id); if (hit) return hit; }
  }
  return null;
}
function themed(masterId) {
  const master = findLib({children: library.children}, masterId);
  const top = {};
  for (const p of ['fill', 'stroke']) if (TOKEN.test(master[p])) top[p] = master[p];
  const descendants = {};
  (function walk(n) {
    if (n.id !== masterId) {
      const props = {};
      for (const p of ['fill', 'stroke']) if (TOKEN.test(n[p])) props[p] = n[p];
      if (Object.keys(props).length) descendants[n.id] = props;
    }
    for (const c of n.children ?? []) walk(c);
  })(master);
  return {top, descendants};
}
function xref(id, masterId, name, overrides = {}, descendants = {}) {
  const auto = themed(masterId);
  const merged = {...auto.descendants};
  for (const [k, v] of Object.entries(descendants)) merged[k] = {...(merged[k] ?? {}), ...v};
  return {id, type: 'ref', ref: `${ALIAS}:${masterId}`, name, ...auto.top, ...overrides,
    descendants: Object.fromEntries(Object.entries(merged).map(([k, v]) => [`${ALIAS}:${k}`, v]))};
}

let seq = 0;
const id = p => `${p}-${++seq}`;
const MARK = num(tokens, '--size-agent-mark');
const CENTER = 980;

// -- shared UI atoms (following the projects-navigation idiom) --------------------

function button(label, variant = 'ghost', glyph) {
  const v = BUTTON_VARIANTS[variant];
  return xref(id('btn'), 'btn-m', label, {...v.overrides, height: num(tokens, '--size-control-sm')}, {
    'btn-ic': glyph ? {icon: glyph, fill: v.fg, enabled: true} : {enabled: false}, 'btn-lb': {content: label, fill: v.fg},
  });
}
function tabsControl(items, active) {
  return frame(id('seg'), 'Tabs', {gap: '$--spacing-xxs', padding: '$--spacing-xxs', fill: '$--card', cornerRadius: '$--radius-sm'},
    items.map((label, i) => xref(id('tab'), 'tab-m', label, i === active ? {fill: '$--secondary'} : {}, {'tab-t': {content: label, fill: i === active ? '$--foreground' : '$--subtle-foreground'}})));
}
function ruleW(w) { return frame(id('r'), 'Rule', {width: w, height: 1, fill: '$--border'}, []); }
function fact(glyph, label, tone = '$--subtle-foreground') {
  return frame(id('f'), label, {gap: '$--spacing-xxs', alignItems: 'center'}, [icon(id('fi'), glyph, {size: 12, fill: tone}), text(id('ft'), label, {size: '$--text-caption', mono: true, fill: tone})]);
}
function factsLine(items, w = CENTER) {
  return frame(id('facts'), 'Facts', {width: w, padding: [0, '$--spacing-lg', '$--spacing-sm', '$--spacing-lg'], gap: '$--spacing-lg', alignItems: 'center'}, items.map(([g, l, t]) => fact(g, l, t)));
}
function titleRow(crumb, action, w = CENTER) {
  const crumbs = crumb.flatMap((c, i) => [
    ...(i ? [text(id('cs'), '/', {size: '$--text-caption', fill: '$--muted-foreground'})] : []),
    text(id('cc'), c, i === crumb.length - 1 ? {size: '$--text-headline', weight: '600'} : {size: '$--text-caption', fill: '$--subtle-foreground'}),
  ]);
  return frame(id('tr'), 'Title', {width: w, height: 48, padding: [0, '$--spacing-lg'], gap: '$--spacing-sm', alignItems: 'center'}, [...crumbs, frame(id('g'), 'Spacer', {width: 'fill_container', height: 1}, []), ...(action ? [action] : [])]);
}
function tabRow(tabs, active, w = CENTER, trailing) {
  return frame(id('tbr'), 'View tabs', {width: w, padding: ['$--spacing-sm', '$--spacing-lg', 0, '$--spacing-lg'], gap: '$--spacing-md', alignItems: 'center'}, [
    tabsControl(tabs, active), ...(trailing ? [frame(id('tbrg'), 'Spacer', {width: 'fill_container', height: 1}, []), trailing] : []),
  ]);
}
function screen(parts, content, mode = 'Dark', w = CENTER, h) {
  return frame(id('scr'), 'Screen', {theme: {Mode: mode}, width: w, ...(h ? {height: h} : {}), layout: 'vertical', fill: '$--background', cornerRadius: '$--radius-md', clip: h ? true : false, stroke: '$--border', strokeWidth: 1}, [...parts, content]);
}
function heading(str, size = '$--text-title') { return text(id('h'), str, {size, weight: '600'}); }
function note(str, width = 900) { return text(id('n'), str, {size: '$--text-body', fill: '#3A3A3C', width}); }
function board(name, children, gap = '$--spacing-lg') {
  return frame(id('bd'), name, {theme: {Mode: 'Dark'}, layout: 'vertical', gap, padding: 28, fill: '#1C1C1E', cornerRadius: '$--radius-lg', width: 'fit_content'}, children);
}
function chip(label, tone = '$--subtle-foreground', fillTone, chipIcon) {
  return frame(id('chip'), label, {height: 20, padding: [0, '$--spacing-xs'], gap: 3, cornerRadius: '$--radius-xs', stroke: fillTone ? undefined : '$--border', strokeWidth: fillTone ? 0 : 1, fill: fillTone ?? '#00000000', alignItems: 'center'}, [
    ...(chipIcon ? [icon(id('chipi'), chipIcon, {size: 10, fill: tone})] : []),
    text(id('chipt'), label, {size: '$--text-micro', fill: tone, weight: '500'}),
  ]);
}
function markDot(status) {
  // status: working | seen | question | approval | error | done | idle | unknown
  if (status === 'working') return frame(id('mb'), 'Mark', {width: MARK, height: 16, justifyContent: 'center', alignItems: 'center'}, [{type: 'ellipse', id: id('mk'), name: 'Dot', width: MARK, height: MARK, fill: '$--agent-working'}]);
  if (status === 'seen' || status === 'idle' || status === 'unknown') return frame(id('mb'), 'Mark', {width: MARK, height: 16, justifyContent: 'center', alignItems: 'center'}, [{type: 'ellipse', id: id('mk'), name: 'Ring', width: MARK, height: MARK, stroke: '$--muted-foreground', strokeWidth: 1.25}]);
  const glyph = {question: '?', approval: '!', error: '✕', done: '✔'}[status];
  const tone = {question: '$--warning', approval: '$--warning', error: '$--destructive', done: '$--success'}[status];
  return frame(id('mb'), 'Mark', {width: MARK, height: 16, justifyContent: 'center', alignItems: 'center'}, [text(id('mt'), glyph, {size: '$--text-caption', weight: '700', fill: tone})]);
}
function providerMark(pv) {
  return frame(id('pv'), 'Provider', {width: 14, height: 14, cornerRadius: '$--radius-xs', fill: {type: 'image', enabled: true, url: art(pv), mode: 'fit'}}, []);
}

const TABS = ['Tasks', 'Agents', 'Sessions']; // Graph is deferred to a separate discussion this round
// The route (e.g. "Observer 경유") is real but secondary - it lives in a tooltip on
// hover, not in the row; the row itself is the click target, so no button either.
function waitingRow({mark, tone, where, line, age}) {
  return frame(id('wr'), line, {width: 'fill_container', height: 34, padding: [0, '$--spacing-sm'], gap: '$--spacing-sm', alignItems: 'center', cornerRadius: '$--radius-sm'}, [
    frame(id('wm'), 'Mark', {width: 14, justifyContent: 'center'}, [text(id('wmt'), mark, {mono: true, size: '$--text-caption', fill: tone, weight: '600'})]),
    text(id('ww'), where, {size: '$--text-caption', fill: '$--subtle-foreground', mono: true}),
    text(id('wl'), line, {fill: '$--foreground'}),
    frame(id('wg'), 'Spacer', {width: 'fill_container', height: 1}, []),
    text(id('wa'), age, {size: '$--text-caption', fill: '$--muted-foreground', mono: true}),
    icon(id('wchev'), 'chevron-right', {size: 14, fill: '$--muted-foreground'}),
  ]);
}
function waitingBand(rows, w = CENTER) {
  return frame(id('wb'), '기다리는 것', {width: w, padding: ['$--spacing-xs', '$--spacing-lg', '$--spacing-sm', '$--spacing-lg']}, [
    frame(id('wbl'), 'Rows', {width: 'fill_container', layout: 'vertical', gap: '$--spacing-xxs', padding: '$--spacing-xxs', fill: '$--card', cornerRadius: '$--radius-md'}, rows.map(waitingRow)),
  ]);
}

// -- Task view card -----------------------------------------------------------------

const STATE_LABEL = {backlog: '백로그', ready: '준비', progress: '진행 중', review: '리뷰', done: '완료'};
const STATE_TONE = {backlog: '$--muted-foreground', ready: '$--subtle-foreground', progress: '$--agent-working', review: '$--warning', done: '$--success'};

const NEEDS_ATTENTION = ['question', 'approval', 'error'];
function agentsSlot(agents, width = 214) {
  // agents: null | {status} | {status, lineage: [{provider,status,role}]}
  if (!agents) return null;
  const labelW = width - 24 - MARK - 14 - 8;
  if (agents.lineage) {
    // The card shows at most the agent that needs attention plus one representative -
    // the full lineage stays in the Agents view, not repeated here.
    const sorted = [...agents.lineage].sort((a, b) => (NEEDS_ATTENTION.includes(b.status) ? 1 : 0) - (NEEDS_ATTENTION.includes(a.status) ? 1 : 0));
    const shown = sorted.slice(0, 2);
    const rest = sorted.length - shown.length;
    return frame(id('ag'), 'Agents', {layout: 'vertical', gap: 2}, [
      ...shown.map(a => frame(id('agr'), a.role, {gap: '$--spacing-xs', alignItems: 'center'}, [markDot(a.status), providerMark(a.provider), text(id('agl'), a.role, {size: '$--text-caption', fill: '$--subtle-foreground', width: labelW})])),
      ...(rest > 0 ? [text(id('agmore'), `+${rest}`, {size: '$--text-caption', fill: '$--muted-foreground'})] : []),
    ]);
  }
  return frame(id('ag'), 'Agents', {gap: '$--spacing-xs', alignItems: 'center'}, [
    markDot(agents.status), providerMark(agents.provider ?? 'claude'), text(id('agl'), agents.label ?? '', {size: '$--text-caption', fill: '$--subtle-foreground', width: labelW}),
  ]);
}

const SOURCE_GLYPH = {github: 'circle-dot', local: 'file-text'};
function taskCard({idLabel, source = 'github', title, state, blockedBy, delivery = [], agents, link, startAgent = false, hover = false, stuck = false, width = 214, stale = false, staleIcon = 'clock', showState = false, titleWidth, project}) {
  const agSlot = agentsSlot(agents, width);
  // The link line only earns its place when there is no #id to click - an id already
  // opens the source (name and branch live in a tooltip on hover, not spelled out here).
  const showLink = link && !idLabel;
  const done = state === 'done';
  const kids = [
    ...(project ? [text(id('tpr'), project, {size: '$--text-micro', fill: '$--muted-foreground'})] : []),
    frame(id('th'), 'Head', {gap: '$--spacing-xxs', alignItems: 'start', width: 'fill_container'}, [
      // The issue id is the task's identity: a source glyph (GitHub circle-dot, local
      // file file-text) plus #id, packed tight so it costs little of the title's room.
      // A bare number never stands for a PR - PRs are always a delivery chip.
      ...(idLabel ? [frame(id('tidg'), 'Id', {gap: '$--spacing-xxs', alignItems: 'center'}, [icon(id('tsg'), SOURCE_GLYPH[source], {size: 8, fill: '$--muted-foreground'}), text(id('tid'), idLabel, {size: '$--text-micro', fill: '$--muted-foreground', mono: true})])] : []),
      text(id('tt'), title, {size: '$--text-subhead', weight: '600', width: titleWidth ?? (idLabel ? width - 24 - 48 : width - 24)}),
      ...(stale ? [icon(id('tsi'), staleIcon, {size: 11, fill: staleIcon === 'alert-circle' ? '$--warning' : '$--muted-foreground'})] : []),
      // Dependencies has no columns to carry state, so it earns one quiet word here.
      ...(showState ? [frame(id('tstg'), 'Spacer', {width: 'fill_container', height: 1}, []), text(id('tst'), STATE_LABEL[state], {size: '$--text-micro', fill: '$--muted-foreground'})] : []),
    ]),
    ...(blockedBy ? [frame(id('tb'), 'Blocked', {gap: '$--spacing-xxs', alignItems: 'center'}, [icon(id('tbi'), 'lock', {size: 11, fill: '$--warning'}), text(id('tbt'), blockedBy, {size: '$--text-caption', fill: '$--warning'})])] : []),
    // A PR is always a delivery chip with its own glyph, colored by PR lifecycle token.
    ...(delivery.length ? [frame(id('td'), 'Delivery', {gap: '$--spacing-xxs', alignItems: 'center', width: 'fill_container'}, delivery.map(([l, t]) => chip(l, t, undefined, l.startsWith('PR ') ? 'git-pull-request' : undefined)))] : []),
    ...(agSlot ? [agSlot] : []),
    ...(showLink ? [frame(id('tl'), 'Link', {gap: '$--spacing-xxs', alignItems: 'start'}, [icon(id('tli'), 'link', {size: 10, fill: '$--muted-foreground'}), text(id('tlt'), link, {size: '$--text-micro', fill: '$--muted-foreground', mono: true, width: width - 24 - 16})])] : []),
    // "Start agent" only shows on hover/focus of an idle ready card - the resting card has no button.
    ...(startAgent && hover ? [frame(id('tsa'), 'Start', {width: 'fill_container'}, [button('에이전트 시작', 'secondary', 'plus')])] : []),
  ];
  return frame(id('card'), title, {width, layout: 'vertical', gap: '$--spacing-xs', padding: '$--spacing-sm', fill: '$--card', cornerRadius: '$--radius-md',
    stroke: stuck ? '$--warning' : (hover ? '$--foreground' : '$--border'), strokeWidth: stuck ? 2 : (hover ? 1.5 : 1),
    opacity: done ? 0.55 : (blockedBy ? 0.7 : 1)}, kids);
}
function column(title, cards, width = 214) {
  return frame(id('col'), title, {width, layout: 'vertical', gap: '$--spacing-sm'}, [text(id('colt'), title, {size: '$--text-subhead', weight: '600'}), ...cards]);
}
// Done starts folded: a name list, not full cards - matches the existing fold pattern (머지됨 3 ›).
function foldColumn(title, names, width = 214) {
  return frame(id('colf'), title, {width, layout: 'vertical', gap: '$--spacing-xs'}, [
    text(id('colft'), title, {size: '$--text-subhead', weight: '600'}),
    frame(id('colfl'), 'Names', {layout: 'vertical', gap: '$--spacing-xxs', padding: '$--spacing-xs', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--border', strokeWidth: 1}, names.map(n =>
      frame(id('colfr'), n, {gap: '$--spacing-xs', alignItems: 'center'}, [text(id('colfrt'), n, {size: '$--text-caption', fill: '$--subtle-foreground', width: width - 24}), icon(id('colfri'), 'chevron-right', {size: 11, fill: '$--muted-foreground'})]),
    )),
  ]);
}

// -- scenario data -------------------------------------------------------------------

// idLabel already opens the source (name and branch move to its hover tooltip),
// so a tracked task never needs a link line - see cardAnatomy for the tooltip example.
const T170 = (width) => taskCard({width,
  idLabel: '#170', title: '기다리는 것 띠', state: 'progress',
  delivery: [['4 files', '$--warning']],
  agents: {lineage: [
    {provider: 'claude', status: 'seen', role: 'Observer'},
    {provider: 'codex', status: 'question', role: 'Implementor'},
  ]},
});
const T171 = (width) => taskCard({width, idLabel: '#171', title: '태스크 출처 어댑터', state: 'ready', blockedBy: '#170', agents: null, startAgent: false});
const T172 = (width) => taskCard({width, idLabel: '#172', title: 'Graph 뷰', state: 'backlog', blockedBy: '#171', agents: null});
const T173 = (width) => taskCard({width, idLabel: '#173', title: '카드 상태 시트', state: 'review',
  delivery: [['PR #174', '$--pr-open'], ['✕ CI', '$--destructive']],
  agents: {status: 'done', provider: 'claude', label: '리뷰 반영'}});
const T169 = () => taskCard({idLabel: '#169', title: '웹 내비게이션', state: 'done', delivery: [['PR #168', '$--pr-merged']], agents: null});
const T_UNTRACKED = (width) => taskCard({width, title: 'quick/155', state: 'progress', agents: {status: 'working', provider: 'claude', label: '브라우저 표시 확인'}, link: '태스크 없음'});

const S_VERIFY = () => taskCard({title: 'verify 슬롯 병렬화', state: 'progress',
  agents: {lineage: [{provider: 'claude', status: 'seen', role: 'Observer · local'}, {provider: 'codex', status: 'working', role: 'Implementor · mini'}]},
  link: '로컬 파일 · tasks.md'});
const S_JUDGE = () => taskCard({title: 'judge 백엔드 전환', state: 'backlog', blockedBy: 'verify 슬롯 병렬화', agents: null, link: '로컬 파일 · tasks.md'});

// -- 1. Legend sheet ------------------------------------------------------------------

function legendSheet() {
  const markRow = (status, label, desc) => frame(id('lr'), label, {gap: '$--spacing-md', alignItems: 'center'}, [
    markDot(status), text(id('lrl'), label, {fill: '$--foreground', width: 90}), text(id('lrd'), desc, {size: '$--text-caption', fill: '$--subtle-foreground', width: 340}),
  ]);
  const colorRow = (tone, label) => frame(id('cr'), label, {gap: '$--spacing-sm', alignItems: 'center'}, [
    frame(id('crd'), 'Swatch', {width: 12, height: 12, cornerRadius: '$--radius-xs', fill: tone}, []), text(id('crl'), label, {size: '$--text-caption', fill: '$--subtle-foreground'}),
  ]);
  return screen([
    titleRow(['Legend'], null),
  ], frame(id('legendBody'), 'Body', {layout: 'vertical', gap: '$--spacing-lg', padding: [0, '$--spacing-lg', '$--spacing-lg', '$--spacing-lg'], width: CENTER}, [
    text(id('l1'), '마크 · 모든 뷰가 공유, 크기는 --size-agent-mark 하나', {size: '$--text-subhead', weight: '600'}),
    frame(id('lc'), 'Marks', {layout: 'vertical', gap: '$--spacing-sm'}, [
      markRow('working', '작업 중', '● 채워진 점, --agent-working'),
      markRow('seen', '확인함', '○ 테두리만, --muted-foreground'),
      markRow('question', '질문', '? 사람 답 필요'),
      markRow('approval', '승인', '! 사람 승인 필요'),
      markRow('done', '완료', '✔ 미확인 완료, --success'),
      markRow('error', '오류', '✕ --destructive'),
    ]),
    text(id('l2'), '의존 관계', {size: '$--text-subhead', weight: '600'}),
    frame(id('ec'), 'Deps', {layout: 'vertical', gap: '$--spacing-sm'}, [
      frame(id('er1'), '선행', {gap: '$--spacing-md', alignItems: 'center'}, [icon(id('eri1'), 'arrow-right', {size: 16, fill: '$--warning'}), text(id('erl1'), '선행', {fill: '$--foreground', width: 90}), text(id('erd1'), '왼쪽이 선행 태스크(블로커), 화살표는 오른쪽의 막힌 태스크로 향함', {size: '$--text-caption', fill: '$--subtle-foreground', width: 340})]),
    ]),
    text(id('l3'), '색 토큰', {size: '$--text-subhead', weight: '600'}),
    frame(id('cc2'), 'Colors', {layout: 'vertical', gap: '$--spacing-xs'}, [
      colorRow('$--agent-working', '$--agent-working · 작업 중'),
      colorRow('$--warning', '$--warning · 질문/승인 대기, 기한 초과'),
      colorRow('$--destructive', '$--destructive · 오류, 실패'),
      colorRow('$--success', '$--success · 완료'),
      colorRow('$--muted-foreground', '$--muted-foreground · 비활성/알 수 없음'),
    ]),
  ]), 'Dark', CENTER);
}

// -- 2. Task view, project scope ----------------------------------------------------

const COLW = 180; // 5 columns fit inside CENTER(980) minus its padding and gaps, edge to edge
function taskBoardHerdr() {
  return frame(id('board'), 'Board', {width: CENTER, gap: '$--spacing-md', padding: ['$--spacing-sm', '$--spacing-lg', '$--spacing-lg', '$--spacing-lg'], alignItems: 'start'}, [
    column('백로그 · 1', [T172(COLW)], COLW),
    column('준비 · 1', [T171(COLW)], COLW),
    column('진행 중 · 2', [T170(COLW), T_UNTRACKED(COLW)], COLW),
    column('리뷰 · 1', [T173(COLW)], COLW),
    foldColumn('완료 · 1 ›', ['웹 내비게이션'], COLW),
  ]);
}
function taskViewProject(mode = 'Dark', taskMode = 0) {
  return screen([
    titleRow(['All projects', 'herdr-ide'], button('New agent', 'default', 'plus')),
    factsLine([['git-pull-request', '2 open PRs']]),
    waitingBand([
      {mark: '?', tone: '$--warning', where: '#170 · feat/waiting-band', line: 'WebContentsView 크기를 창 기준으로 할까요?', age: '20m'},
    ]),
    ruleW(CENTER), tabRow(TABS, 0, CENTER, modeSwitch(taskMode)),
  ], taskMode === 0 ? taskBoardHerdr() : taskDependenciesProject(), mode);
}

// -- Phase 2: task card state sheet ---------------------------------------------------

function cardCell(caption, card) {
  return frame(id('cc'), caption, {layout: 'vertical', gap: '$--spacing-xs', alignItems: 'start'}, [
    text(id('cct'), caption, {size: '$--text-micro', fill: '$--muted-foreground', weight: '600'}), card,
  ]);
}
function cardStateSheet() {
  const cells = [
    cardCell('1 · 에이전트 없음 (Backlog)', taskCard({idLabel: '#172', title: 'Graph 뷰', state: 'backlog', agents: null})),
    cardCell('2 · 준비, 막힘(blocked-by)', taskCard({idLabel: '#171', title: '태스크 출처 어댑터', state: 'ready', blockedBy: '#170', agents: null})),
    cardCell('3 · 준비, 유휴 (hover/focus) → Start agent', taskCard({idLabel: '#175', title: '모바일 레이아웃 검토', state: 'ready', agents: null, startAgent: true, hover: true})),
    cardCell('4 · 진행 중, 변경 파일', taskCard({idLabel: '#170', title: '기다리는 것 띠', state: 'progress', delivery: [['4 files', '$--warning']], agents: {status: 'working', provider: 'codex', label: 'Implementor'}})),
    cardCell('5 · 진행 중, 계보(질문 있음)', taskCard({idLabel: '#170', title: '기다리는 것 띠', state: 'progress', delivery: [['4 files', '$--warning']], agents: {lineage: [{provider: 'claude', status: 'seen', role: 'Observer'}, {provider: 'codex', status: 'question', role: 'Implementor'}]}})),
    cardCell('6 · 진행 중, ↑commits', taskCard({idLabel: '#176', title: '단축키 재배치', state: 'progress', delivery: [['↑3', '$--subtle-foreground']], agents: {status: 'working', provider: 'claude', label: 'Implementor'}})),
    cardCell('7 · 리뷰, PR CI 통과', taskCard({idLabel: '#177', title: '검색 팔레트 UI', state: 'review', delivery: [['PR #180', '$--pr-open'], ['✓ CI', '$--success']], agents: {status: 'seen', provider: 'claude', label: '리뷰 대기'}})),
    cardCell('8 · 리뷰, PR CI 실패', taskCard({idLabel: '#173', title: '카드 상태 시트', state: 'review', delivery: [['PR #174', '$--pr-open'], ['✕ CI', '$--destructive']], agents: {status: 'done', provider: 'claude', label: '리뷰 반영'}})),
    cardCell('9 · 리뷰, CI 대기 중', taskCard({idLabel: '#178', title: '디스크 정리 배지', state: 'review', delivery: [['PR #181', '$--pr-open'], ['● CI 진행 중', '$--subtle-foreground']], agents: {status: 'working', provider: 'codex', label: '수정 반영'}})),
    cardCell('10 · 승인 대기', taskCard({idLabel: '#179', title: '원격 실행 승인', state: 'progress', agents: {status: 'approval', provider: 'codex', label: 'rm -rf target 승인 필요'}})),
    cardCell('11 · 오류', taskCard({idLabel: '#182', title: '빌드 스크립트 수정', state: 'progress', agents: {status: 'error', provider: 'codex', label: '빌드 실패'}})),
    cardCell('12 · 완료, 미확인', taskCard({idLabel: '#183', title: '설정 화면 정리', state: 'review', agents: {status: 'done', provider: 'claude', label: '리뷰 반영 끝남'}})),
    cardCell('13 · 완료, 머지됨', taskCard({idLabel: '#169', title: '웹 내비게이션', state: 'done', delivery: [['PR #168', '$--pr-merged']], agents: null})),
    cardCell('14 · 완료, main보다 뒤처짐', taskCard({idLabel: '#160', title: '데스크톱 호스트', state: 'done', delivery: [['PR #156', '$--pr-merged'], ['↓12 behind', '$--warning']], agents: null})),
    cardCell('15 · 미추적 체크아웃, 태스크 없음', T_UNTRACKED()),
  ];
  const rows = [cells.slice(0, 5), cells.slice(5, 10), cells.slice(10, 15)];
  return frame(id('cs'), 'Card states', {layout: 'vertical', gap: '$--spacing-lg', padding: '$--spacing-lg', fill: '$--background', cornerRadius: '$--radius-md'}, [
    text(id('cst'), '슬롯: 제목·ID(클릭 시 출처 열기, hover 시 툴팁) · 상태 · 막힘(blocked-by) · 배송 사실(변경/커밋/PR+CI/머지/behind) · 에이전트(없음/작업/질문/승인/오류/완료미확인/계보 최대 2 + N) · 유휴 태스크에 hover/focus 시에만 Start agent', {size: '$--text-caption', fill: '$--subtle-foreground', width: 1100}),
    ...rows.map((r, i) => frame(id('csr'), `Row ${i}`, {gap: '$--spacing-lg', alignItems: 'start'}, r)),
  ]);
}

// -- Task card anatomy: what each part does on click ---------------------------------

function cardAnatomy() {
  const card = taskCard({idLabel: '#170', title: '기다리는 것 띠', state: 'progress', delivery: [['4 files', '$--warning']], agents: {status: 'question', provider: 'codex', label: 'Implementor'}});
  const idTooltip = frame(id('canidt'), 'Tooltip', {layout: 'vertical', gap: 2, padding: ['$--spacing-xs', '$--spacing-sm'], fill: '$--popover', stroke: '$--border', strokeWidth: 1, cornerRadius: '$--radius-sm', width: 180}, [
    text(id('canidtt'), 'GitHub · feat/waiting-band', {size: '$--text-micro', fill: '$--subtle-foreground', mono: true}),
  ]);
  const idHoverRow = frame(id('canidr'), 'ID hover', {gap: '$--spacing-md', alignItems: 'start'}, [card, idTooltip]);
  const idleCard = taskCard({idLabel: '#175', title: '모바일 레이아웃 검토', state: 'ready', agents: null, startAgent: true, hover: true});
  const noteRow = (n, label) => frame(id('cann'), label, {gap: '$--spacing-sm', alignItems: 'start'}, [
    text(id('cannn'), String(n), {size: '$--text-caption', weight: '700', fill: '$--muted-foreground', width: 14}),
    text(id('cannt'), label, {size: '$--text-caption', fill: '$--subtle-foreground', width: 400}),
  ]);
  const notes = frame(id('canl'), 'Notes', {layout: 'vertical', gap: '$--spacing-sm', width: 420}, [
    noteRow(1, '헤더(제목) 클릭 → 이 태스크의 체크아웃을 엽니다'),
    noteRow(2, '에이전트 행 클릭 → 그 에이전트의 pane을 엽니다'),
    noteRow(3, 'ID 클릭 → 태스크 출처 URL을 엽니다. hover 시 출처 이름과 브랜치를 툴팁으로 보여줍니다'),
    noteRow(4, '"에이전트 시작"은 유휴 태스크를 hover/focus했을 때만 나타납니다 - 평상시 카드에는 버튼이 없습니다'),
  ]);
  return frame(id('cana'), 'Anatomy', {layout: 'vertical', gap: '$--spacing-lg', padding: '$--spacing-lg', fill: '$--background', cornerRadius: '$--radius-md'}, [
    frame(id('canr'), 'Row', {gap: '$--spacing-xl', alignItems: 'start'}, [
      frame(id('canc'), 'Cards', {layout: 'vertical', gap: '$--spacing-md'}, [idHoverRow, idleCard]),
      notes,
    ]),
  ]);
}

// -- Task/Agents states: empty, source failure, many items, long-title wrap ---------

function emptyCase() {
  return screen([
    titleRow(['All projects', 'modakbul'], null),
    ruleW(CENTER), tabRow(TABS, 0),
  ], frame(id('empb'), 'Empty', {layout: 'vertical', gap: '$--spacing-sm', padding: ['$--spacing-xl', '$--spacing-lg'], alignItems: 'center', width: CENTER}, [
    icon(id('empi'), 'inbox', {size: 24, fill: '$--muted-foreground'}),
    text(id('empt'), '태스크 출처가 연결되지 않았고, 실행 중인 에이전트도 없습니다', {size: '$--text-body', fill: '$--subtle-foreground'}),
    button('GitHub 이슈 연결', 'secondary', 'link'),
  ]), 'Dark', CENTER);
}

function sourceFailureCase() {
  const failCard = taskCard({idLabel: '#170', title: '기다리는 것 띠', state: 'progress', agents: {status: 'working', provider: 'codex', label: 'Implementor'}, stale: true, staleIcon: 'alert-circle'});
  const tooltip = frame(id('sft'), 'Tooltip', {layout: 'vertical', gap: 2, padding: ['$--spacing-xs', '$--spacing-sm'], fill: '$--popover', stroke: '$--border', strokeWidth: 1, cornerRadius: '$--radius-sm', width: 240}, [
    text(id('sftt'), 'GitHub 이슈 읽기 실패', {size: '$--text-caption', weight: '600', fill: '$--warning'}),
    text(id('sftb'), '마지막으로 확인된 상태를 보여주는 중 - 자세한 오류는 진단 로그 참고, 배너 없음', {size: '$--text-micro', fill: '$--muted-foreground', width: 216}),
  ]);
  return frame(id('sfw'), 'Failure', {gap: '$--spacing-lg', alignItems: 'start'}, [failCard, tooltip]);
}

function manyItemsCase() {
  const names = Array.from({length: 40}, (_, i) => `백로그 태스크 #${190 + i}`);
  return frame(id('manyw'), 'Many', {layout: 'vertical', gap: '$--spacing-xs', width: COLW}, [
    text(id('manyt'), '백로그 · 40', {size: '$--text-subhead', weight: '600'}),
    frame(id('manyc'), 'Clipped', {layout: 'vertical', gap: '$--spacing-xxs', padding: '$--spacing-xs', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--border', strokeWidth: 1}, names.slice(0, 6).map(n =>
      frame(id('manyr'), n, {gap: '$--spacing-xs', alignItems: 'center'}, [text(id('manyrt'), n, {size: '$--text-caption', fill: '$--subtle-foreground', width: COLW - 24})]),
    )),
    text(id('manym'), '스크롤 · 34개 더 보기', {size: '$--text-caption', fill: '$--muted-foreground'}),
  ]);
}

function longTitleCase() {
  const card = taskCard({idLabel: '#191', title: '설정 화면에서 원격 기기 재연결 흐름을 다듬고 오류 메시지를 정리하는 작업', state: 'ready', agents: null, width: COLW, titleWidth: COLW - 24 - 44});
  return frame(id('ltw'), 'Long title', {width: COLW}, [card]);
}

function statesRow() {
  return frame(id('stw'), 'States', {layout: 'vertical', gap: '$--spacing-lg'}, [
    frame(id('stwr'), 'Row', {gap: '$--spacing-xl', alignItems: 'start'}, [manyItemsCase(), longTitleCase()]),
    sourceFailureCase(),
  ]);
}

// -- Task view mode switch (Board / Dependencies) inside the Tasks toolbar -----------

function modeSwitch(active) {
  const items = ['Board', 'Dependencies'];
  return frame(id('msw'), 'Mode', {gap: '$--spacing-xxs', padding: '$--spacing-xxs', fill: '$--card', cornerRadius: '$--radius-sm'},
    items.map((label, i) => xref(id('mst'), 'tab-m', label, i === active ? {fill: '$--secondary'} : {}, {'tab-t': {content: label, fill: i === active ? '$--foreground' : '$--subtle-foreground'}})));
}

// -- Task Dependencies: a compact-card graph on a free-form canvas, connected by real
// path edges (not glyphs) with an arrowhead, read left to right: blocker -> blocked. --

const DEP_W = 214, DEP_H = 190, DEP_GAP_X = 80, DEP_ROW_GAP = 40;

// A Dependencies node is the same task card as the Board - same anatomy (id, title,
// delivery chips, agents capped at +N). The only addition is one quiet state word at
// the head's top right, since Dependencies has no columns to carry state. A fixed
// outer height (DEP_H) keeps every node's vertical center predictable regardless of
// its card's real content height, so an edge anchored at y0 + DEP_H/2 always lands on
// the node's true midline.
function depNode({x, y, ...card}) {
  return frame(id('dn'), card.title, {x, y, layoutPosition: 'absolute', width: DEP_W, height: DEP_H, layout: 'vertical', justifyContent: 'center'}, [
    taskCard({...card, width: DEP_W, showState: true}),
  ]);
}
// A real line + arrowhead between two node anchors, left to right; the legend explains
// the arrow once, so no per-edge label.
function depEdgeReal(x1, y1, x2, y2) {
  const tone = '$--warning';
  const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
  const w = Math.abs(x2 - x1) || 1, h = Math.abs(y2 - y1) || 1;
  const path = {type: 'path', id: id('dep'), name: 'edge-dep', x: minX, y: minY, layoutPosition: 'absolute', width: w, height: h, viewBox: [minX, minY, w, h],
    geometry: `M ${x1} ${y1} L ${x2} ${y2}`, stroke: tone, strokeWidth: 2, strokeLinecap: 'round', fill: '#00000000'};
  const arrow = {...icon(id('depa'), 'play', {size: 10, fill: tone}), x: x2 - 5, y: y2 - 5, layoutPosition: 'absolute', rotation: 0};
  return [path, arrow];
}
// Places nodes left to right (blocker first), connected by real edges.
function depChainCanvas(nodes, x0 = 0, y0 = 0) {
  const children = [];
  let x = x0;
  nodes.forEach((n, i) => {
    children.push(depNode({...n, x, y: y0}));
    if (i < nodes.length - 1) {
      const y = y0 + DEP_H / 2;
      children.push(...depEdgeReal(x + DEP_W, y, x + DEP_W + DEP_GAP_X, y));
    }
    x += DEP_W + DEP_GAP_X;
  });
  return {children, right: x - DEP_GAP_X};
}
// Unrelated nodes placed apart, in their own row, with no edges between them.
function depRowCanvas(nodes, x0 = 0, y0 = 0) {
  const children = [];
  let x = x0;
  nodes.forEach(n => {
    children.push(depNode({...n, x, y: y0}));
    x += DEP_W + DEP_GAP_X;
  });
  return {children};
}
function taskDependenciesProject() {
  const chain = depChainCanvas([
    {idLabel: '#170', title: '기다리는 것 띠', state: 'progress', stuck: true,
      delivery: [['4 files', '$--warning']],
      agents: {lineage: [{provider: 'claude', status: 'seen', role: 'Observer'}, {provider: 'codex', status: 'question', role: 'Implementor'}]}},
    {idLabel: '#171', title: '태스크 출처 어댑터', state: 'ready', blockedBy: '#170', agents: null},
    {idLabel: '#172', title: 'Graph 뷰', state: 'backlog', blockedBy: '#171', agents: null},
  ], 0, 0);
  const row2 = depRowCanvas([
    {idLabel: '#173', title: '카드 상태 시트', state: 'review',
      delivery: [['PR #174', '$--pr-open'], ['✕ CI', '$--destructive']],
      agents: {status: 'done', provider: 'claude', label: '리뷰 반영'}},
    {idLabel: '#169', title: '웹 내비게이션', state: 'done', delivery: [['PR #168', '$--pr-merged']], agents: null},
  ], 0, DEP_H + DEP_ROW_GAP);
  const h = DEP_H * 2 + DEP_ROW_GAP;
  const canvas = frame(id('depscanvas'), 'Canvas', {layout: 'none', width: CENTER - 32, height: h}, [...chain.children, ...row2.children]);
  return frame(id('deps'), 'Dependencies', {padding: ['$--spacing-sm', '$--spacing-lg', '$--spacing-lg', '$--spacing-lg']}, [canvas]);
}
function taskDependenciesAll() {
  // Cross-project dependency: a sasu task blocked by a herdr-ide task, left to right.
  const cross = depChainCanvas([
    {idLabel: '#170', title: '기다리는 것 띠', state: 'progress', stuck: true, project: 'herdr-ide',
      delivery: [['4 files', '$--warning']], agents: {status: 'question', provider: 'codex', label: 'Implementor'}},
    {title: 'judge 백엔드 전환', state: 'backlog', project: 'sasu', source: 'local', blockedBy: '#170', agents: null},
  ], 0, 0);
  const herdrChain = depChainCanvas([
    {idLabel: '#171', title: '태스크 출처 어댑터', state: 'ready', project: 'herdr-ide', agents: null},
    {idLabel: '#172', title: 'Graph 뷰', state: 'backlog', project: 'herdr-ide', blockedBy: '#171', agents: null},
  ], 0, DEP_H + DEP_ROW_GAP + 20);
  const captions = [
    frame(id('crosst'), 'Caption 1', {x: 0, y: 0, layoutPosition: 'absolute', width: 300}, [text(id('crosstt'), '프로젝트 간 의존 (herdr-ide → sasu)', {size: '$--text-micro', weight: '600', fill: '$--muted-foreground'})]),
    frame(id('herdrt2'), 'Caption 2', {x: 0, y: DEP_H + DEP_ROW_GAP, layoutPosition: 'absolute', width: 300}, [text(id('herdrt2t'), 'herdr-ide', {size: '$--text-micro', weight: '600', fill: '$--muted-foreground'})]),
  ];
  const canvas = frame(id('depsallc'), 'Canvas', {layout: 'none', width: CENTER, height: DEP_H * 2 + DEP_ROW_GAP + 20}, [...captions, ...cross.children, ...herdrChain.children]);
  const modakbulNote = frame(id('mdnote'), 'modakbul', {layout: 'vertical', gap: '$--spacing-xs', padding: '$--spacing-md', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--border', strokeWidth: 1, width: 'fill_container'}, [
    frame(id('mdnh'), 'Head', {gap: '$--spacing-xs', alignItems: 'center'}, [icon(id('mdni'), 'plug', {size: 13, fill: '$--muted-foreground'}), text(id('mdnt'), 'modakbul · 태스크 출처 연결 안 됨', {weight: '600', fill: '$--subtle-foreground'})]),
    text(id('mdnb'), '의존 관계를 그릴 태스크가 없음', {size: '$--text-caption', fill: '$--muted-foreground'}),
  ]);
  return frame(id('depsall'), 'Dependencies all', {layout: 'vertical', gap: '$--spacing-lg', padding: ['$--spacing-sm', '$--spacing-lg', '$--spacing-lg', '$--spacing-lg'], width: CENTER}, [
    canvas,
    modakbulNote,
  ]);
}
// -- Phase 4: Task view All projects, stale-source tooltip, Agents view -------------

function projectStrip(name, ws, counts) {
  return frame(id('mp'), name, {width: 'fill_container', height: 36, padding: [0, '$--spacing-sm'], gap: '$--spacing-md', alignItems: 'center'}, [
    text(id('mpn'), name, {fill: '$--foreground', width: 140}), text(id('mpw'), ws, {size: '$--text-caption', fill: '$--subtle-foreground'}),
    frame(id('g'), 'Spacer', {width: 'fill_container', height: 1}, []),
    ...counts.map(([n, tone]) => text(id('mpc'), n, {size: '$--text-caption', fill: tone})),
  ]);
}
function modakbulEmptyCard() {
  return frame(id('mke'), 'modakbul empty', {layout: 'vertical', gap: '$--spacing-xs', padding: '$--spacing-md', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--border', strokeWidth: 1, width: 'fill_container'}, [
    frame(id('mkeh'), 'Head', {gap: '$--spacing-xs', alignItems: 'center'}, [icon(id('mkei'), 'plug', {size: 13, fill: '$--muted-foreground'}), text(id('mket'), 'modakbul · 태스크 출처 연결 안 됨', {weight: '600', fill: '$--subtle-foreground'})]),
    text(id('mkeb'), '1개 에이전트가 작업 중이지만 이 프로젝트에는 태스크 출처가 없음', {size: '$--text-caption', fill: '$--muted-foreground'}),
    frame(id('mkea'), 'Action', {}, [button('GitHub 이슈 연결', 'secondary', 'link')]),
  ]);
}
function taskViewAll(mode = 'Dark', taskMode = 0) {
  const boardAll = frame(id('bda'), 'Board', {width: CENTER, gap: '$--spacing-md', padding: ['$--spacing-sm', '$--spacing-lg', '$--spacing-lg', '$--spacing-lg'], alignItems: 'start'}, [
    column('백로그 · 1', [T172(COLW)], COLW),
    column('준비 · 2', [T171(COLW), taskCard({width: COLW, title: 'judge 백엔드 전환', state: 'ready', blockedBy: 'verify 슬롯 병렬화', agents: null, link: '로컬 파일(sasu) · tasks.md'})], COLW),
    column('진행 중 · 3', [T170(COLW), taskCard({width: COLW, title: 'verify 슬롯 병렬화', state: 'progress', agents: {lineage: [{provider: 'claude', status: 'seen', role: 'Observer'}, {provider: 'codex', status: 'working', role: 'Implementor · mini'}]}, link: '로컬 파일(sasu) · tasks.md'}), T_UNTRACKED(COLW)], COLW),
    column('리뷰 · 1', [T173(COLW)], COLW),
    foldColumn('완료 · 1', ['웹 내비게이션'], COLW),
  ]);
  const boardBody = frame(id('tva'), 'Body', {layout: 'vertical', gap: '$--spacing-sm'}, [boardAll, frame(id('tvap'), 'Projects w/o source', {padding: [0, '$--spacing-lg', '$--spacing-lg', '$--spacing-lg'], width: CENTER}, [modakbulEmptyCard()])]);
  return screen([
    titleRow(['All projects'], null),
    factsLine([['git-pull-request', '2 open PRs']]),
    waitingBand([
      {mark: '?', tone: '$--warning', where: 'herdr-ide · #170 · feat/waiting-band', line: 'WebContentsView 크기를 창 기준으로 할까요?', age: '20m'},
    ]),
    ruleW(CENTER), tabRow(TABS, 0, CENTER, modeSwitch(taskMode)),
  ], taskMode === 0 ? boardBody : taskDependenciesAll(), mode);
}

function staleSourceCase() {
  const staleCard = taskCard({idLabel: '#170', title: '기다리는 것 띠', state: 'progress', delivery: [['4 files', '$--warning']], agents: {status: 'working', provider: 'codex', label: 'Implementor'}, stale: true});
  const tooltip = frame(id('sst'), 'Tooltip', {layout: 'vertical', gap: 2, padding: ['$--spacing-xs', '$--spacing-sm'], fill: '$--popover', stroke: '$--border', strokeWidth: 1, cornerRadius: '$--radius-sm', width: 220}, [
    text(id('sstt'), 'GitHub 갱신 지연', {size: '$--text-caption', weight: '600'}),
    text(id('sstb'), '마지막 동기화 8분 전 - 배너 없이 카드 시계 아이콘에만 표시', {size: '$--text-micro', fill: '$--muted-foreground', width: 196}),
  ]);
  return frame(id('ssw'), 'Stale', {gap: '$--spacing-lg', alignItems: 'start'}, [staleCard, tooltip]);
}

// Agents view: columns 진행 중 / 내 확인 대기 / 끝. Each row carries a small task
// chip (or none for an untracked checkout); a delegated child indents under its parent.
function agentCard({title, checkout, taskChip, provider, status, age, machine, indent = false}) {
  return frame(id('ac'), title, {width: 220, layout: 'vertical', gap: '$--spacing-xs', padding: [0, 0, 0, indent ? 20 : 0]}, [
    frame(id('acb'), 'Body', {layout: 'vertical', gap: '$--spacing-xs', padding: '$--spacing-sm', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--border', strokeWidth: 1}, [
      frame(id('ach'), 'Head', {gap: '$--spacing-xs', alignItems: 'center'}, [markDot(status), providerMark(provider), text(id('act'), title, {weight: '600', width: 110}), frame(id('acg'), 'Spacer', {width: 'fill_container', height: 1}, []), text(id('aca'), age, {size: '$--text-micro', fill: '$--muted-foreground', mono: true})]),
      text(id('acc'), checkout, {size: '$--text-caption', fill: '$--subtle-foreground'}),
      frame(id('acf'), 'Footer', {gap: '$--spacing-xxs', alignItems: 'center'}, [
        ...(taskChip ? [chip(taskChip, '$--subtle-foreground', undefined, taskChip.startsWith('#') ? 'circle-dot' : 'file-text')] : [text(id('acnochip'), '태스크 없음', {size: '$--text-micro', fill: '$--muted-foreground'})]),
        ...(machine ? [icon(id('acmi'), 'server', {size: 10, fill: '$--muted-foreground'}), text(id('acmt'), machine, {size: '$--text-micro', fill: '$--muted-foreground'})] : []),
      ]),
    ]),
  ]);
}
function agentsBoard(cols) {
  return frame(id('agb'), 'Agents board', {width: CENTER, gap: '$--spacing-lg', padding: ['$--spacing-sm', '$--spacing-lg', '$--spacing-lg', '$--spacing-lg'], alignItems: 'start'}, cols.map(([title, cards]) => column(title, cards, 220)));
}
function agentsViewProject(mode = 'Dark') {
  return screen([
    titleRow(['All projects', 'herdr-ide'], null),
    ruleW(CENTER), tabRow(TABS, 1),
  ], agentsBoard([
    ['진행 중 · 4', [
      agentCard({title: 'Implementor', checkout: 'feat/waiting-band', taskChip: '#170', provider: 'codex', status: 'question', age: '3m'}),
      agentCard({title: '리뷰어 A', checkout: 'feat/waiting-band', taskChip: '#170', provider: 'claude', status: 'working', age: '2m', indent: true}),
      agentCard({title: '브라우저 표시 확인', checkout: 'quick/155', taskChip: null, provider: 'claude', status: 'working', age: '12m'}),
      agentCard({title: '원격 실행 승인', checkout: 'main', taskChip: '#179', provider: 'codex', status: 'approval', age: '1m'}),
    ]],
    ['내 확인 대기 · 2', [
      agentCard({title: 'Observer', checkout: 'feat/waiting-band', taskChip: '#170', provider: 'claude', status: 'question', age: '20m'}),
      agentCard({title: '빌드 스크립트 수정', checkout: 'fix/build', taskChip: '#182', provider: 'codex', status: 'error', age: '5m'}),
    ]],
    ['끝 · 2', [
      agentCard({title: '리뷰 반영', checkout: 'quick/154', taskChip: '#173', provider: 'claude', status: 'done', age: '10m'}),
      agentCard({title: '설정 화면 정리', checkout: 'fix/settings', taskChip: '#183', provider: 'claude', status: 'seen', age: '1h'}),
    ]],
  ]), mode);
}
function agentsViewAll(mode = 'Dark') {
  return screen([
    titleRow(['All projects'], null),
    ruleW(CENTER), tabRow(TABS, 1),
  ], agentsBoard([
    ['진행 중 · 5', [
      agentCard({title: 'Implementor', checkout: 'herdr-ide · feat/waiting-band', taskChip: '#170', provider: 'codex', status: 'question', age: '3m'}),
      agentCard({title: '리뷰어 A', checkout: 'herdr-ide · feat/waiting-band', taskChip: '#170', provider: 'claude', status: 'working', age: '2m', indent: true}),
      agentCard({title: '브라우저 표시 확인', checkout: 'herdr-ide · quick/155', taskChip: null, provider: 'claude', status: 'working', age: '12m'}),
      agentCard({title: 'Implementor', checkout: 'sasu · verify 병렬화', taskChip: 'verify 슬롯 병렬화', provider: 'codex', status: 'working', age: '6m', machine: 'mini'}),
      agentCard({title: '작업 중', checkout: 'modakbul · main', taskChip: null, provider: 'claude', status: 'working', age: '30m'}),
    ]],
    ['내 확인 대기 · 1', [agentCard({title: 'Observer', checkout: 'herdr-ide · feat/waiting-band', taskChip: '#170', provider: 'claude', status: 'question', age: '20m'})]],
    ['끝 · 1', [agentCard({title: '리뷰 반영', checkout: 'herdr-ide · quick/154', taskChip: '#173', provider: 'claude', status: 'done', age: '10m'})]],
  ]), mode);
}

// -- Phase 5: summary board -----------------------------------------------------------

function summaryColumn(title, question, shows, dataNow, dataNew) {
  return frame(id('sc'), title, {width: 300, layout: 'vertical', gap: '$--spacing-sm', padding: '$--spacing-md', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--border', strokeWidth: 1}, [
    text(id('sct'), title, {size: '$--text-title', weight: '700'}),
    text(id('scq'), question, {size: '$--text-caption', fill: '$--subtle-foreground', width: 268}),
    ruleW(268),
    text(id('sch1'), '보여주는 것', {size: '$--text-micro', weight: '600', fill: '$--muted-foreground'}),
    ...shows.map(s => text(id('scs'), `· ${s}`, {size: '$--text-caption', width: 268})),
    text(id('sch2'), '지금 있는 데이터', {size: '$--text-micro', weight: '600', fill: '$--success'}),
    text(id('scn'), dataNow, {size: '$--text-caption', fill: '$--subtle-foreground', width: 268}),
    text(id('sch3'), '새로 필요한 데이터', {size: '$--text-micro', weight: '600', fill: '$--warning'}),
    text(id('scw'), dataNew, {size: '$--text-caption', fill: '$--subtle-foreground', width: 268}),
  ]);
}
function summaryBoard() {
  const cols = frame(id('sccols'), 'Columns', {gap: '$--spacing-lg', alignItems: 'start'}, [
    summaryColumn('Task', '어떤 일이 있고, 얼마나 진행됐나?',
      ['태스크 카드 (제목·ID·막힘·배송 사실·에이전트)', '정규화된 상태 칼럼', '출처가 없으면 빈 상태'],
      'GitHub 이슈 API, hide의 체크아웃/에이전트 상태', 'Linear 등 다른 출처 어댑터, 로컬 파일 파서'),
    summaryColumn('Agents', '지금 누가 무엇을 하나?',
      ['에이전트 카드 (진행 중/내 확인 대기/끝)', '체크아웃·태스크 칩·계보 들여쓰기', '원격 기기 표시'],
      'hide의 에이전트 상태·계보 (herdr-core/sidebar.rs)', '없음 - 이미 있는 데이터로 충분'),
  ]);
  const questions = frame(id('sq'), 'Open questions', {layout: 'vertical', gap: '$--spacing-xs', padding: '$--spacing-md', fill: '$--card', cornerRadius: '$--radius-md', stroke: '$--warning', strokeWidth: 1, width: 940}, [
    text(id('sqt'), '사용자에게 물어볼 것', {size: '$--text-subhead', weight: '600'}),
    text(id('sq1'), '1. Dependencies 모드는 Board와 같은 화면(모드 전환)이 맞는지, 별도 탭이 더 나은지?', {size: '$--text-caption', fill: '$--subtle-foreground', width: 900}),
    text(id('sq2'), '2. 태스크 출처가 여러 개(GitHub + 로컬 파일)일 때 All projects에서 하나의 칸반/의존 그래프로 섞을지, 출처별로 나눌지?', {size: '$--text-caption', fill: '$--subtle-foreground', width: 900}),
    text(id('sq3'), '3. 40개 이상 백로그 항목의 스크롤/더 보기 방식이 이걸로 충분한지, 별도 확장 보기가 필요한지?', {size: '$--text-caption', fill: '$--subtle-foreground', width: 900}),
    text(id('sq4'), '4. 나중의 Graph(에이전트 관계) 뷰와 지금의 Dependencies(태스크 관계) 뷰를 같은 화면에서 토글할지, 완전히 분리할지?', {size: '$--text-caption', fill: '$--subtle-foreground', width: 900}),
  ]);
  return frame(id('sb2'), 'Summary', {layout: 'vertical', gap: '$--spacing-lg'}, [cols, questions]);
}

const libraryPath = path.relative(path.dirname(path.resolve(out)), path.join(root, 'design/hide-ui.lib.pen'));
// -- Issue vs PR: the issue is the task, the PR is the delivery ---------------------

function issuePrCaseSheet() {
  const cells = [
    cardCell('1 · 이슈, 체크아웃 없음 (백로그)', taskCard({idLabel: '#185', title: '알림 배지 정리', state: 'backlog', agents: null})),
    cardCell('2 · 이슈 + 체크아웃, PR 없음', taskCard({idLabel: '#186', title: '단축키 문서화', state: 'progress', agents: {status: 'working', provider: 'claude', label: 'Implementor'}})),
    cardCell('3 · 이슈 + PR, CI 통과', taskCard({idLabel: '#187', title: '검색 인덱스 캐시', state: 'review', delivery: [['PR #190', '$--pr-open'], ['✓ CI', '$--success']], agents: {status: 'seen', provider: 'claude', label: '리뷰 대기'}})),
    cardCell('4 · 이슈 + PR, CI 실패', taskCard({idLabel: '#188', title: '탭 순서 수정', state: 'review', delivery: [['PR #191', '$--pr-open'], ['✕ CI', '$--destructive']], agents: {status: 'working', provider: 'codex', label: '수정 반영'}})),
    cardCell('5 · 이슈 + PR, CI 진행 중', taskCard({idLabel: '#189', title: '설정 마이그레이션', state: 'review', delivery: [['PR #192', '$--pr-open'], ['● CI 진행 중', '$--subtle-foreground']], agents: {status: 'working', provider: 'claude', label: 'Implementor'}})),
    cardCell('6 · 이슈 + PR 머지됨 → 완료', T169()),
    cardCell('7 · 미추적 체크아웃 + PR, 이슈 없음', taskCard({title: 'fix/tab-crash', state: 'progress', delivery: [['PR #193', '$--pr-draft']], agents: {status: 'working', provider: 'codex', label: 'Implementor'}})),
    cardCell('8 · 미추적 체크아웃, PR 없음', T_UNTRACKED()),
    cardCell('9a · PR이 이슈 둘을 닫음', taskCard({idLabel: '#194', title: '탭 포커스 버그', state: 'review', delivery: [['PR #196', '$--pr-merged']], agents: null})),
    cardCell('9b · 같은 PR, 다른 이슈', taskCard({idLabel: '#195', title: '탭 순서 회귀', state: 'review', delivery: [['PR #196', '$--pr-merged']], agents: null})),
  ];
  const rows = [cells.slice(0, 5), cells.slice(5, 10)];
  return frame(id('ips'), 'Issue vs PR', {layout: 'vertical', gap: '$--spacing-lg', padding: '$--spacing-lg', fill: '$--background', cornerRadius: '$--radius-md'}, [
    text(id('ipst'), '이슈 = 할 일(카드 헤더의 #id), PR = 결과물(배송 칩의 PR #n) - 헤더의 숫자는 절대 PR을 뜻하지 않음', {size: '$--text-caption', fill: '$--subtle-foreground', width: 1100}),
    ...rows.map((r, i) => frame(id('ipsr'), `Row ${i}`, {gap: '$--spacing-lg', alignItems: 'start'}, r)),
  ]);
}

// -- Agents view rows: task chip only (no PR), title/branch/PR in a hover tooltip ---

function agentChipTooltip({title, branch, pr}) {
  return frame(id('act2'), 'Tooltip', {layout: 'vertical', gap: 2, padding: ['$--spacing-xs', '$--spacing-sm'], fill: '$--popover', stroke: '$--border', strokeWidth: 1, cornerRadius: '$--radius-sm', width: 200}, [
    text(id('act2t'), title, {size: '$--text-caption', weight: '600'}),
    text(id('act2b'), pr ? `${branch} · ${pr}` : branch, {size: '$--text-micro', fill: '$--muted-foreground', mono: true, width: 176}),
  ]);
}
function agentRowsPrExamples() {
  const withPr = agentCard({title: 'Implementor', checkout: 'feat/waiting-band', taskChip: '#170', provider: 'codex', status: 'working', age: '3m'});
  const noPr = agentCard({title: 'Observer', checkout: 'feat/mobile-review', taskChip: '#175', provider: 'claude', status: 'seen', age: '9m'});
  const untracked = agentCard({title: '브라우저 표시 확인', checkout: 'quick/155', taskChip: null, provider: 'claude', status: 'working', age: '12m'});
  const tooltip = agentChipTooltip({title: '기다리는 것 띠', branch: 'feat/waiting-band', pr: 'PR #174'});
  return frame(id('agpr'), 'Rows', {gap: '$--spacing-xl', alignItems: 'start'}, [
    frame(id('agprr1'), 'With PR', {layout: 'vertical', gap: '$--spacing-xs'}, [text(id('agprc1'), 'PR 있는 태스크', {size: '$--text-micro', fill: '$--muted-foreground'}), frame(id('agprw'), 'Row', {gap: '$--spacing-md', alignItems: 'start'}, [withPr, tooltip])]),
    frame(id('agprr2'), 'No PR', {layout: 'vertical', gap: '$--spacing-xs'}, [text(id('agprc2'), 'PR 없는 태스크', {size: '$--text-micro', fill: '$--muted-foreground'}), noPr]),
    frame(id('agprr3'), 'Untracked', {layout: 'vertical', gap: '$--spacing-xs'}, [text(id('agprc3'), '미추적 체크아웃', {size: '$--text-micro', fill: '$--muted-foreground'}), untracked]),
  ]);
}

// -- One-page rules sheet: where the issue shows, where the PR shows, what opens what --

function rulesSheet() {
  const rows = [
    ['이슈 (#id)', '카드 헤더, Dependencies 노드 헤더, Agents 행의 태스크 칩', 'ID 클릭 → 태스크 출처 URL을 엽니다'],
    ['PR', '카드/노드의 배송 칩만 (git-pull-request 글리프 + PR #n, 생명주기 색 + 읽혔으면 CI 마크)', 'PR 칩 클릭 → 그 PR을 엽니다'],
    ['카드 헤더(제목)', '모든 태스크 카드', '헤더 클릭 → 이 태스크의 체크아웃을 엽니다'],
    ['에이전트 행', 'Board 카드의 에이전트 슬롯, Agents 뷰의 각 행', '행 클릭 → 그 에이전트의 pane을 엽니다'],
  ];
  const colW = [150, 560, 300];
  const headerRow = frame(id('rsh'), 'Header', {gap: '$--spacing-md'}, [
    text(id('rsh1'), '항목', {size: '$--text-micro', weight: '700', fill: '$--muted-foreground', width: colW[0]}),
    text(id('rsh2'), '어디에 보이나', {size: '$--text-micro', weight: '700', fill: '$--muted-foreground', width: colW[1]}),
    text(id('rsh3'), '클릭하면', {size: '$--text-micro', weight: '700', fill: '$--muted-foreground', width: colW[2]}),
  ]);
  const dataRows = rows.map(([a, b, c]) => frame(id('rsr'), a, {gap: '$--spacing-md', alignItems: 'start'}, [
    text(id('rsra'), a, {size: '$--text-caption', weight: '600', width: colW[0]}),
    text(id('rsrb'), b, {size: '$--text-caption', fill: '$--subtle-foreground', width: colW[1]}),
    text(id('rsrc'), c, {size: '$--text-caption', fill: '$--subtle-foreground', width: colW[2]}),
  ]));
  const prLegend = frame(id('rspl'), 'PR tones', {gap: '$--spacing-lg', alignItems: 'center', padding: ['$--spacing-sm', 0, 0, 0]}, [
    text(id('rsplt'), 'PR 생명주기 색', {size: '$--text-micro', weight: '600', fill: '$--muted-foreground'}),
    chip('PR #1 open', '$--pr-open', undefined, 'git-pull-request'),
    chip('PR #2 draft', '$--pr-draft', undefined, 'git-pull-request'),
    chip('PR #3 merged', '$--pr-merged', undefined, 'git-pull-request'),
    chip('PR #4 closed', '$--pr-closed', undefined, 'git-pull-request'),
  ]);
  return frame(id('rules'), 'Rules', {layout: 'vertical', gap: '$--spacing-md', padding: '$--spacing-lg', fill: '$--background', cornerRadius: '$--radius-md', width: 1080}, [
    headerRow, ruleW(1010), ...dataRows, prLegend,
  ]);
}

function write(children) {
  fs.writeFileSync(out, JSON.stringify({version: '2.18', themes: {Mode: ['Light', 'Dark']}, imports: {[ALIAS]: libraryPath}, variables: readLocalVariables(root), children}, null, 2));
  console.log(`wrote ${out}`);
}

// Phase 1 board: legend + Task view (Board + Dependencies), project scope
const phase1 = board('Phase 1', [
  heading('1. 범례'), legendSheet(),
  heading('2. Task 뷰 · Board · 프로젝트 스코프 (herdr-ide, 기다리는 것 띠 포함)'), taskViewProject('Dark', 0),
  heading('3. Task 뷰 · Dependencies · 프로젝트 스코프 (herdr-ide, #170 → #171 → #172)'), taskViewProject('Dark', 1),
]);

const phase2 = board('Phase 2', [
  heading('4. Task 카드 상태 시트 · 15개 조합'), frame(id('p2wrap'), 'Wrap', {theme: {Mode: 'Dark'}, fill: '$--background', cornerRadius: '$--radius-md'}, [cardStateSheet()]),
  heading('5. Task 카드 anatomy · 클릭 시 동작'), frame(id('p2anat'), 'Wrap', {theme: {Mode: 'Dark'}}, [cardAnatomy()]),
]);

const phase3 = board('Phase 3', [
  heading('6. Task 뷰 · Board · All projects (3개 출처 혼합, 출처 없는 프로젝트)'), taskViewAll('Dark', 0),
  heading('7. Task 뷰 · Dependencies · All projects (herdr-ide → sasu 프로젝트 간 의존)'), taskViewAll('Dark', 1),
]);

const phase4 = board('Phase 4', [
  heading('8. Agents 뷰 · 프로젝트 스코프 (계보, 원격 mini, 태스크 칩)'), agentsViewProject(),
  heading('9. Agents 뷰 · All projects 스코프'), agentsViewAll(),
  heading('10. 상태 · 빈 화면 / 출처 읽기 실패 / 40개 항목 / 긴 제목 줄바꿈'),
  frame(id('p4states'), 'Wrap', {theme: {Mode: 'Dark'}, layout: 'vertical', gap: '$--spacing-lg'}, [emptyCase(), frame(id('p4statesw'), 'Wrap2', {fill: '$--background', cornerRadius: '$--radius-md', padding: '$--spacing-md'}, [statesRow()])]),
]);

const phase5 = board('Phase 5', [
  heading('11. Light 모드 · Task 뷰 Board · 프로젝트 스코프'), taskViewProject('Light', 0),
  heading('12. Light 모드 · Task 뷰 Dependencies · 프로젝트 스코프'), taskViewProject('Light', 1),
  heading('13. Light 모드 · Agents 뷰 · 프로젝트 스코프'), agentsViewProject('Light'),
  heading('14. 요약 · 두 뷰와 열린 질문'), summaryBoard(),
]);

const phase6 = board('Phase 6', [
  heading('15. 이슈 vs PR · 이슈는 할 일, PR은 결과물'), frame(id('p6wrap'), 'Wrap', {theme: {Mode: 'Dark'}}, [issuePrCaseSheet()]),
  heading('16. Agents 뷰 행 · 태스크 칩만, PR은 툴팁에서'), frame(id('p6agpr'), 'Wrap', {theme: {Mode: 'Dark'}, fill: '$--background', cornerRadius: '$--radius-md', padding: '$--spacing-lg'}, [agentRowsPrExamples()]),
  heading('17. 규칙 한 장 요약'), frame(id('p6rules'), 'Wrap', {theme: {Mode: 'Dark'}}, [rulesSheet()]),
]);

write([phase1, phase2, phase3, phase4, phase5, phase6]);
