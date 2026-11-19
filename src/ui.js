// DOM heads-up display: balance, running total, banners, popups, collection sheet.
import { ITEMS, ITEM, TIERS, COMBOS, UNITS_PER_BET } from './game/math.js';

const $ = (id) => document.getElementById(id);
export const fmt = (cents) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mult = (units) => { const v = units / UNITS_PER_BET; return `×${Number.isInteger(v) ? v : v.toFixed(2).replace(/0$/, '')}`; };

export function createUI(thumbs) {
  const el = { balance: $('balance'), win: $('win'), winValue: $('win-value'), callout: $('callout'), banner: $('banner'), popups: $('popups'), prompt: $('prompt'), bet: $('bet'), betPill: document.querySelector('.bet'), modal: $('modal'), body: $('modal-body'), bag: $('bag-count'), fast: $('fast') };
  const nums = { balance: { shown: 0, target: 0, node: el.balance }, win: { shown: 0, target: 0, node: el.winValue } };

  function update(dt) {
    for (const n of Object.values(nums)) {
      if (n.shown === n.target) continue;
      const d = n.target - n.shown, step = Math.sign(d) * Math.max(1, Math.abs(d) * Math.min(1, dt * 9));
      n.shown = Math.abs(step) >= Math.abs(d) ? n.target : Math.round(n.shown + step);
      n.node.textContent = fmt(n.shown);
    }
  }
  function setBalance(c, instant) { nums.balance.target = c; if (instant) { nums.balance.shown = c; el.balance.textContent = fmt(c); } }
  function setBet(c) { el.bet.textContent = fmt(c); }
  function restart(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  function roundStart() {
    nums.win.shown = nums.win.target = 0; el.winValue.textContent = fmt(0); el.winValue.style.setProperty('--c', '#ff3d8b');
    el.win.classList.add('on'); el.banner.innerHTML = ''; el.callout.innerHTML = '';
    el.prompt.classList.remove('on'); el.betPill.classList.add('locked');
  }
  function addWin(c, color) { nums.win.target += c; if (color) el.winValue.style.setProperty('--c', color); restart(el.winValue, 'pop'); }
  function roundEnd() { el.betPill.classList.remove('locked'); setFast(false); }
  function showPrompt(text) { el.prompt.textContent = text; el.prompt.classList.add('on'); }
  function setFast(on) { el.fast.hidden = !on; }

  function popup(x, y, cents, color, tier = 0) {
    const d = document.createElement('div');
    d.className = 'popup'; d.style.left = `${x}px`; d.style.top = `${y}px`; d.style.setProperty('--c', color);
    d.style.fontSize = `${22 + tier * 6}px`;
    d.innerHTML = `<b>+${fmt(cents)}</b>`;
    el.popups.append(d); setTimeout(() => d.remove(), 1100);
  }
  function callout(id, cents, hold = 1.2, big = false) {
    const it = ITEM[id], t = TIERS[it.tier];
    el.callout.innerHTML = `<div class="callout ${big ? 'big' : ''}" style="--c:${t.color};--hold:${hold}s"><img src="${thumbs[id]}" alt=""><div><div class="t">${t.name}</div><div class="n">${it.name}</div></div><div class="v">+${fmt(cents)}</div>${it.keep ? '<div class="kept">KEPT!</div>' : ''}</div>`;
  }
  function banner({ kicker, title, amount, color = '#ff3d8b', hold = 1.6, icons, small, low }) {
    el.banner.classList.toggle('low', !!low);
    const letters = [...title].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    el.banner.innerHTML = `<div class="banner ${small ? 'small' : ''}" style="--c:${color};--hold:${hold}s">${icons ? `<div class="icons">${icons.map((i) => `<img src="${thumbs[i]}" alt="">`).join('')}</div>` : ''}${kicker ? `<div class="k">${kicker}</div>` : ''}<div class="title">${letters}</div>${amount != null ? `<div class="amt">+${fmt(amount)}</div>` : ''}</div>`;
  }
  // A prize's symbol bursts out of the trough and flies up into the total.
  function symbolPop(x, y, id) {
    const tier = ITEM[id].tier, size = 54 + tier * 14;
    const d = document.createElement('div');
    d.className = `sym t${tier}`; d.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--c:${TIERS[tier].color}`;
    d.innerHTML = `<i class="rays"></i><i class="ring"></i><img src="${thumbs[id]}" alt="">`;
    el.popups.append(d);
    const r = el.winValue.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
    const hold = 0.34 + tier * 0.05, total = 950 + tier * 120;
    const anim = d.animate([
      { transform: 'translate(-50%,-50%) scale(.2) rotate(-25deg)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.25) rotate(6deg)', opacity: 1, offset: 0.16 },
      { transform: 'translate(-50%,-80%) scale(1) rotate(0deg)', opacity: 1, offset: hold },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35) rotate(20deg)`, opacity: 0.9 },
    ], { duration: total, easing: 'cubic-bezier(.4,0,.5,1)', fill: 'forwards' });
    anim.onfinish = () => { d.remove(); restart(el.winValue, 'pop'); };
  }
  function flash() { restart($('flash'), 'go'); }
  function vignette(on) { $('vignette').classList.toggle('on', on); }
  function setHype(l) { document.documentElement.style.setProperty('--hype', l.toFixed(2)); }
  function setSound(on) { $('btn-sound').classList.toggle('off', !on); }
  function setBag(n) { el.bag.hidden = !n; el.bag.textContent = n; }

  function openSheet(store) {
    const keep = ITEMS.filter((i) => i.keep);
    const cell = (i, n, locked) => `<div class="cell ${locked ? 'locked' : ''}" style="--c:${TIERS[i.tier].color}">${n ? `<i class="n">${n}</i>` : ''}<img src="${thumbs[i.id]}" alt="">${locked ? '???' : i.name}<b class="x">${mult(i.units)}</b></div>`;
    el.body.innerHTML = `
      <h2>Your collection</h2>
      <p>Rare prizes are yours to keep. Find them all!</p>
      <div class="stats"><div>Rounds<b>${store.stats.rounds}</b></div><div>Best win<b>${fmt(store.stats.best)}</b></div><div>Prizes kept<b>${Object.values(store.collection).reduce((a, b) => a + b, 0)}</b></div></div>
      <h3>Keepers</h3>
      <div class="grid">${keep.map((i) => cell(i, store.collection[i.id] || 0, !store.collection[i.id])).join('')}</div>
      <h3>Combos</h3>
      ${COMBOS.map((c) => `<div class="combo-row">${c.items.map((i) => `<img src="${thumbs[i]}" alt="${ITEM[i].name}" title="${ITEM[i].name}">`).join('')}<b class="nm">${c.name}</b><span>+${mult(c.bonus).slice(1)}× bet</span></div>`).join('')}
      <h3>Everything in the machine</h3>
      <div class="grid">${ITEMS.map((i) => cell(i, 0, false)).join('')}</div>
      <h3>How it works</h3>
      <p>Tap anywhere to pay your bet. Every item that drops adds its value (a multiple of your bet) to the round total. Each combo pays once per round when all of its items have dropped. Tap during a round to fast-forward.</p>
      <p>Each round's result is drawn before the items fall. Theoretical return to player: <b>${(store.rtp * 100).toFixed(0)}%</b>. Snackpot is played with free play credits only — no real money is wagered or won.</p>`;
    el.modal.hidden = false;
  }
  function closeSheet() { el.modal.hidden = true; }
  $('modal-close').addEventListener('click', closeSheet);
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeSheet(); });

  return { update, setBalance, setBet, roundStart, roundEnd, addWin, showPrompt, setFast, popup, callout, banner, symbolPop, setHype, flash, vignette, setSound, setBag, openSheet, closeSheet, get sheetOpen() { return !el.modal.hidden; } };
}
