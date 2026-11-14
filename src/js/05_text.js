// ---------- interface strings ----------
const STR = {
  zh: {
    title: '缚夜', tag: '一笔成环，万鬼皆封', by: '藤野京 作',
    'm.start': '入夜', 'm.continue': '续行', 'm.daily': '每日一夜', 'm.shrine': '神社', 'm.codex': '图鉴', 'm.settings': '设置', 'm.help': '玩法',
    'm.continue.d': '{0} · {1} · 第 {2} 场', 'm.daily.d': '今日：{0} · {1}', 'm.daily.best': '今日最佳 {0}',
    ok: '确定', cancel: '取消', back: '返回', close: '关闭', yes: '是', no: '否',
    'hero.title': '择灵', 'hero.locked': '未解锁', 'hero.go': '入夜', 'hero.night': '夜', 'hero.best': '已渡过 {0}', 'hero.none': '尚未渡过一夜',
    'hero.hp': '生命', 'hero.spd': '速度', 'hero.trail': '墨痕',
    'hud.lv': '等级', 'hud.boss': '首领', 'hud.stage': '第 {0} 场', 'hud.loop': '轮回 {0}', 'hud.until': '首领将至',
    'lv.title': '得符', 'lv.sub': '选一张', 'lv.new': '新', 'lv.evo': '进阶', 'lv.reroll': '重选 ×{0}', 'lv.banish': '驱除 ×{0}', 'lv.banish.on': '点一张符将其驱除', 'lv.heal': '灵气', 'lv.heal.d': '回复 1 点生命（已满则得魂）',
    'rel.title': '神器', 'rel.sub': '首领留下的东西，带走一件',
    'kind.seal': '封印', 'kind.trail': '墨痕', 'kind.aux': '随从', 'kind.body': '灵体', 'kind.evo': '进阶', 'kind.relic': '神器',
    'pause.title': '暂歇', 'pause.resume': '继续', 'pause.quit': '放弃此夜', 'pause.build': '此夜所得', 'pause.sure': '就此放弃？已得的灵玉仍会结算。',
    'end.dead': '魂散', 'end.won': '夜尽天明', 'end.dead.sub': '止步于第 {0} 场 · {1}', 'end.won.sub': '{0} · {1}，百鬼退散',
    'end.time': '历时', 'end.kills': '封杀', 'end.ring': '最大一圈', 'end.level': '等级', 'end.score': '功德', 'end.jade': '灵玉',
    'end.again': '再来一夜', 'end.next': '更深的夜', 'end.endless': '无尽夜行', 'end.title': '回到标题', 'end.unlock': '新笔灵：{0}', 'end.ach': '成就：{0}',
    'shrine.title': '神社', 'shrine.sub': '以灵玉供奉，所得庇佑每一夜都在', 'shrine.max': '已满', 'jade': '灵玉',
    'codex.title': '图鉴', 'codex.tali': '符', 'codex.foe': '妖', 'codex.relic': '神器', 'codex.ach': '成就', 'codex.unseen': '尚未遇见', 'codex.evo': '进阶：{0} ＋ {1}（皆满级）',
    'set.title': '设置', 'set.lang': '语言', 'set.music': '音乐', 'set.sfx': '音效', 'set.shake': '震屏', 'set.reduce': '减弱动态', 'set.dmg': '伤害数字', 'set.haptics': '触感反馈', 'set.quality': '画质', 'set.q0': '自动', 'set.q1': '高', 'set.q2': '省电',
    'set.full': '全屏', 'set.toggle': '切换', 'set.export': '导出存档', 'set.import': '导入存档', 'set.copy': '复制', 'set.copied': '已复制', 'set.copyfail': '未能自动复制，请手动选择文字', 'set.paste': '把存档文字粘贴在这里', 'set.load': '读取', 'set.bad': '这段文字不是有效的存档', 'set.loaded': '存档已读取', 'set.on': '开', 'set.off': '关',
    'help.title': '玩法',
    'help.body': '<p><b>移动</b>：鼠标指向、WASD／方向键，或在屏幕上拖动。</p><p><b>封印</b>：你身后拖着一道墨痕。绕着妖怪画一个圈，让墨痕<b>首尾相接</b>——圈里的妖怪当场被封。一圈封得越多，伤害越高。</p><p><b>冲刺</b>：空格／点击鼠标／第二根手指。冲刺时无敌。</p><p><b>受伤</b>会震断墨痕。有些妖怪也会专门来断它。</p><p><b>升级</b>时三选一拿符；击败首领后带走一件神器。两张符都满级，可以<b>进阶</b>。</p><p>渡过五场即过一夜；之后还有更深的夜。</p>',
    'tut.1': '移动：鼠标／WASD／拖动屏幕', 'tut.2': '绕着妖怪画一个圈，让墨痕首尾相接', 'tut.3': '漂亮！一圈套得越多，伤害越高', 'tut.4': '空格或点击可以冲刺，冲刺时无敌',
    'ban.stage': '第{0}场', 'ban.boss': '首领', 'ban.clear': '场清', 'ban.flawless': '无伤',
    oops: '出了点小岔子', 'nogl': '此设备无法启用 WebGL，游戏无法运行。',
    'num.1': '一', 'num.2': '二', 'num.3': '三', 'num.4': '四', 'num.5': '五',
  },
  en: {
    title: '缚夜', tag: 'One stroke, one ring, a thousand demons sealed', by: 'by 藤野京',
    'm.start': 'Enter the Night', 'm.continue': 'Continue', 'm.daily': 'Daily Night', 'm.shrine': 'Shrine', 'm.codex': 'Codex', 'm.settings': 'Settings', 'm.help': 'How to Play',
    'm.continue.d': '{0} · {1} · stage {2}', 'm.daily.d': 'Today: {0} · {1}', 'm.daily.best': 'Today’s best {0}',
    ok: 'OK', cancel: 'Cancel', back: 'Back', close: 'Close', yes: 'Yes', no: 'No',
    'hero.title': 'Choose a Spirit', 'hero.locked': 'Locked', 'hero.go': 'Enter the Night', 'hero.night': 'Night', 'hero.best': 'Survived {0}', 'hero.none': 'No night survived yet',
    'hero.hp': 'Life', 'hero.spd': 'Speed', 'hero.trail': 'Trail',
    'hud.lv': 'Lv', 'hud.boss': 'Boss', 'hud.stage': 'Stage {0}', 'hud.loop': 'Cycle {0}', 'hud.until': 'boss approaching',
    'lv.title': 'A Talisman', 'lv.sub': 'choose one', 'lv.new': 'new', 'lv.evo': 'evolution', 'lv.reroll': 'Reroll ×{0}', 'lv.banish': 'Banish ×{0}', 'lv.banish.on': 'Tap a talisman to banish it', 'lv.heal': 'Vital Breath', 'lv.heal.d': 'Heal 1 life (or gain souls if full)',
    'rel.title': 'A Relic', 'rel.sub': 'left behind by the boss — take one',
    'kind.seal': 'Seal', 'kind.trail': 'Trail', 'kind.aux': 'Follower', 'kind.body': 'Body', 'kind.evo': 'Evolution', 'kind.relic': 'Relic',
    'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.quit': 'Give up this night', 'pause.build': 'What you carry', 'pause.sure': 'Give up? The jade you have earned is still yours.',
    'end.dead': 'Scattered', 'end.won': 'Daybreak', 'end.dead.sub': 'Fell in stage {0} · {1}', 'end.won.sub': '{0} · {1} — the parade is broken',
    'end.time': 'Time', 'end.kills': 'Sealed', 'end.ring': 'Largest ring', 'end.level': 'Level', 'end.score': 'Merit', 'end.jade': 'Jade',
    'end.again': 'Another Night', 'end.next': 'A Deeper Night', 'end.endless': 'Endless Parade', 'end.title': 'Title', 'end.unlock': 'New spirit: {0}', 'end.ach': 'Feat: {0}',
    'shrine.title': 'Shrine', 'shrine.sub': 'Offer jade for blessings that last through every night', 'shrine.max': 'max', 'jade': 'Jade',
    'codex.title': 'Codex', 'codex.tali': 'Talismans', 'codex.foe': 'Yokai', 'codex.relic': 'Relics', 'codex.ach': 'Feats', 'codex.unseen': 'not yet met', 'codex.evo': 'Evolution: {0} + {1} (both at top level)',
    'set.title': 'Settings', 'set.lang': 'Language', 'set.music': 'Music', 'set.sfx': 'Sound', 'set.shake': 'Screen shake', 'set.reduce': 'Reduce motion', 'set.dmg': 'Damage numbers', 'set.haptics': 'Haptics', 'set.quality': 'Quality', 'set.q0': 'Auto', 'set.q1': 'High', 'set.q2': 'Saver',
    'set.full': 'Fullscreen', 'set.toggle': 'Toggle', 'set.export': 'Export save', 'set.import': 'Import save', 'set.copy': 'Copy', 'set.copied': 'Copied', 'set.copyfail': 'Could not copy automatically — select the text by hand', 'set.paste': 'Paste a save code here', 'set.load': 'Load', 'set.bad': 'That is not a valid save code', 'set.loaded': 'Save loaded', 'set.on': 'On', 'set.off': 'Off',
    'help.title': 'How to Play',
    'help.body': '<p><b>Move</b>: point with the mouse, use WASD / arrows, or drag on the screen.</p><p><b>Seal</b>: an ink trail follows you. Draw a ring around the yokai and let the trail <b>cross itself</b> — everything inside is sealed on the spot. The more you catch in one ring, the harder it hits.</p><p><b>Dash</b>: Space / click / a second finger. You cannot be hurt while dashing.</p><p>Being <b>hit</b> breaks your trail, and some yokai come to cut it on purpose.</p><p>Each <b>level</b> offers one of three talismans; each boss leaves a relic. Two talismans at their top level can <b>evolve</b>.</p><p>Five stages make a night. Deeper nights wait beyond.</p>',
    'tut.1': 'Move: mouse / WASD / drag on the screen', 'tut.2': 'Draw a ring around the yokai — let your trail cross itself', 'tut.3': 'Well done! The more you catch in one ring, the harder it hits', 'tut.4': 'Space or a click dashes — you cannot be hurt while dashing',
    'ban.stage': 'Stage {0}', 'ban.boss': 'Boss', 'ban.clear': 'Cleared', 'ban.flawless': 'Untouched',
    oops: 'Something went wrong', 'nogl': 'WebGL is not available on this device, so the game cannot run.',
    'num.1': '1', 'num.2': '2', 'num.3': '3', 'num.4': '4', 'num.5': '5',
  },
};
function T(key, ...args) {
  let s = (STR[LANG] && STR[LANG][key]) != null ? STR[LANG][key] : STR.zh[key];
  if (s == null) return key;
  for (let i = 0; i < args.length; i++) s = s.split('{' + i + '}').join(args[i]);
  return s;
}
const nm = (o) => (LANG === 'zh' ? o.zh : o.en);
