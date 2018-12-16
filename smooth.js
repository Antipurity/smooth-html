(function() {try{
	"Allocates memory hideously.", "Uses maps where properties would have sufficed.";

	"May break, in pages:"
	"Page code reading children of document.documentElement may break (that is where clones of removed nodes get put to die neatly)."
	"Page code reading element.className (and not .classList) might break.",
	"Page code reading element.style.transform might break (it is used for position transitions).";
	"Fade-out clones elements, so matching CSS rules may change (if they depended on their still-alive parents), and removed elements may look different before they disappear.";

	if (typeof self === ''+void 0) return;
	const log = console.log;
	const prev = Symbol('prevLayout');
	finish.r = [], finish.w = [], finish.s = 0, finish.rects = new Map;

	const isFinite = Number.isFinite, parseFloat = Number.parseFloat;
	if (!self.MutationObserver)
		return console.info('Browser does not support MutationObserver — cannot smooth');
	const once = { capture:true, once:true, passive:true }, many = { capture:true, passive:true };
	if (!self.requestAnimationFrame)
		return console.info('Browser does not support requestAnimationFrame — cannot smooth');
	if (!self.performance)
		return console.info('Browser does not support performance — cannot smooth');
	const nextFrame = self.requestAnimationFrame.bind(self);
	const now = self.performance.now.bind(self.performance);
	const dur = 200|("ms is hardcoded", "since laziness can be afforded.");
	const locks = new Map;
	const dirty = new Map, shiny = new Set;
	let scheduled = false, start, cur, len, touchNumber = 0;
	setInterval(() => { 0 && log('touched:', touchNumber), touchNumber = 0 }, 1000);



	if (document.body && document.readyState !== 'loading') init();
	else addEventListener('DOMContentLoaded', init, once);

	function init() {
		const o = new MutationObserver(on);
		o.observe(document.body, {
			attributes:true,
			characterData:true,
			childList:true,
			subtree:true,
		});
		for (let e of document.getElementsByTagName('IMG'))
			write(() => { hide(e), show(e, false) });

		read(() => {
			{"Including this script and transition.css in a page directly, and having <body class=ⴻvoid>, will make it fade in."}
				("Though it's enough to just have (in addition to the class):",
					"css, .ⴻvoid  {  opacity: 0;  filter: blur(2px);  visibility: hidden  }",
					"js, `setTimeout(()=>document.body.classList.remove('ⴻvoid'), 100)` or the like.")
			if (document.body.classList.contains('ⴻvoid'))
				write(() => show(document.body, false));
			else if ("scripts didn't inject so late")
				"document.body would have faded in great";
		});

		addEventListener('resize', () => read(() => touch(document.body)), many);
		addEventListener('transitionstart', evt => evt.target && read(() => touch(evt.target)), many);
		addEventListener('transitionend', evt => evt.target && read(() => look(evt.target)), many);
		addEventListener(self.PointerEvent ? 'pointerenter' : 'mouseenter', enter, many);
		let id = null;
		function enter(evt) {
			clearTimeout(id), id = evt.target ? setTimeout(point, 300, evt.target) : null;
		}
		function point(e) { id = null, read(() => { touch(e), anchor(e) }) }
	}
	function on(a) {
		read(() => {
			try {
				let i,n;
				for (i=0; i < a.length; ++i) {
					touch(a[i].target), neighbors(a[i]);
					if (a[i].type === 'childList') {
						const x = a[i].addedNodes, y = a[i].removedNodes;
						if (!x.length && y.length===1 && y[0].nodeType!==1) {
							const z = a[i+1] && a[i+1].type === 'childList' && a[i+1].addedNodes;
							if (z && a[i+1].target===a[i].target && z.length===1 && z[0].nodeType!==1) {
								~~"Likely setting .textContent (very common) — do not animate."
								z[0][prev] = y[0][prev];
								continue;
							}
						}
						if (!y.length && x.length===1 && x[0].nodeType!==1) {
							const z = a[i+1] && a[i+1].type === 'childList' && a[i+1].removedNodes;
							if (z && a[i+1].target===a[i].target && z.length===1 && z[0].nodeType!==1) {
								("Does not seem to trigger in Firefox, but is left just in case.")
								x[0][prev] = z[0][prev];
								continue;
							}
						}
						"Those before do not catch all .textContent sets, but most, so good enough."
						x.forEach(appeared);
						y.forEach(moved);
					}
				}
			}catch(err){log(err)}
		});
	}
	function removeProperty(e, prop) {
		write();
		e.style.removeProperty(prop);
		if (!e.style.length) e.removeAttribute('style');
	}
	function unclass(e, ...k) {
		write();
		e.classList.remove(...k);
		if (!e.classList.length) e.removeAttribute('class');
	}



	function hide(e, imm = true) {
		write();
		if (e.nodeType !== 1) return;
		snap(e, imm);
		e.classList.add('ⴻvoid');
	}
	function show(e, imm = true) {
		write();
		if (e.nodeType !== 1) return;
		snap(e, false);
		if (!imm && e.tagName === 'IMG' && e.complete && e.naturalWidth === 0) {
			"Images do not seem to ever fade in… Maybe later."
				"Should we, on insert, search the whole subtree for images?"
			const id = setTimeout(e => write(() => show(e)), 1000, e);
			e.addEventListener('load', () => { clearTimeout(id), write(() => show(e)) }, once);
		} else unclass(e, 'ⴻvoid');
	}
	function snap(e, to = true) {
		write();
		if (e === document.body) return;
		if (e.nodeType === 1) to ? e.classList.add('ⴻsnap') : unclass(e, 'ⴻsnap');
	}
	function absoluteRemove(e, from, into) {
		read();
		if (e.parentNode) return;
		if (!e || !from || !from.p) return;
		const oldPL = from.p[prev] || layout(from.p);
		intoSameSpace(from, into);
		e = e.cloneNode(true);
		write(() => {try{
			if (e.nodeType !== 1) {
				const p = document.createElement('span');
				p.style.display = 'inline';
				p.appendChild(e);
				e = p;
			}
			if (from.ix !== null && oldPL) {
				const p = document.createElement('div');
				p.style.width = oldPL.cw + 'px';
				p.style.height = oldPL.ch + 'px';
				const sp = document.createElement('span');
				sp.style.display = 'inline-block';
				sp.style.width = (from.ix - from.x) + 'px';
				sp.style.height = (from.iy - from.y) + 'px';
				p.appendChild(sp);
				p.appendChild(e);
				e = p;
			}
			e.style.display = 'block';
			e.style.position = 'absolute';
			e.style.margin = 0;
			e.style.left = from.x + 'px';
			e.style.top = from.y + 'px';
			e.style.width = from.w + 'px';
			e.style.height = from.h + 'px';
			e.style.zIndex = 9999;
			e.style.overflow = 'hidden';
			e.style.pointerEvents = 'none';
			e.style.userSelect = e.style.MozUserSelect = 'none';
			snap(e);
			into.append(e);
			read(() => {
				const to = layout(e);
				if (Math.round(from.cw - to.cw)!==0 || Math.round(from.ch - to.ch)!==0)
					write(() => e.remove());
				else
					write(() => {
						hide(e, false);
						ontransitionendHasNotProvenSteadfast => 'easier to not trust';
						setTimeout(() => write(() => e.remove()), dur);
					})
			});
		}catch(err){log(err)}});
	}



	function lock(e) {
		`Fail if e or its parents or children were locked.`
		"(In other words, if any ancestors were locked directly, or if e was locked in/directly.)"
			"(here, locks.get(e) is: >0 — indirect, <0 — direct, void — neither.)"
		if (locks.has(e)) return false;
		let p;
		for (p = e.parentNode; p && p !== self && p !== document; p = p.parentNode)
			if (locks.get(p) < 0) return false;
		const a = [];
		for (p = e; p && p !== self && p !== document; p = p.parentNode)
			a.push(p);
		if (!a.length) return false;
		lockArr(e, a), setTimeout(unlockArr, dur, e, a);
		return true;
	}
	function lockArr(e,a) {
		let i;
		for (i = 0; i < a.length; ++i)
			if (!locks.has(a[i])) locks.set(a[i], 1);
			else if (locks.get(a[i]) > 0) locks.set(a[i], locks.get(a[i]) + 1);
			else if (locks.get(a[i]) < 0) locks.set(a[i], locks.get(a[i]) - 1);
			else throw log(a[i]), "Zero-locks detected (should be not in the map at all)";
		if (!locks.has(e)) throw "a does not contain e";
		if (locks.get(e)<0) throw "Directly locked twice";
		locks.set(e, -locks.get(e));
	}
	function unlockArr(e,a) {
		let i;
		for (i = 0; i < a.length; ++i)
			if (locks.get(a[i]) > 1) locks.set(a[i], locks.get(a[i]) - 1);
			else if (locks.get(a[i]) < -1) locks.set(a[i], locks.get(a[i]) + 1);
			else locks.delete(a[i]);
		if (!locks.has(e)) throw "a does not contain e";
		if (locks.get(e)>0) throw "Directly unlocked what has not been directly locked";
		locks.set(e, -locks.get(e));
	}



	function layout(e) {
		read();
		const er = clientRect(e);
		if (!er || !e.nodeType) return;
		const s = getComputedStyle(e.nodeType === 1 ? e : document.documentElement);
		if (s.display === 'none' || s.position === 'sticky') return;
		const p = getContainer(e,s);
		const pr = clientRect(p), ps = getComputedStyle(p);
		if (!pr) return;
		const px = pr.x - p.scrollLeft - parseFloat(ps.paddingLeft);
		const py = pr.y - p.scrollTop - parseFloat(ps.paddingTop);
		const x = er.x - px, y = er.y - py;
		let ox,oy; "offset x/y"
		if (e.nodeType !== 1)
			ox = Math.round(x), oy = Math.round(y);
		else if (e.offsetParent === p.offsetParent)
			ox = e.offsetLeft - p.offsetLeft, oy = e.offsetTop - p.offsetTop;
		else
			ox = e.offsetLeft, oy = e.offsetTop;
		const w = Math.ceil(er.width), h = Math.ceil(er.height);

		const padLeft = parseFloat(s.paddingLeft), padTop = parseFloat(s.paddingTop);
		const cx = er.x - p.scrollLeft - padLeft;
		const cy = er.y - p.scrollTop - padTop;
		let cw,ch; "content x/y/w/h"
		if (e.nodeType !== 1) {
			(".scrollWidth/Height round their values.")
			cw = e.scrollWidth - Math.floor(padLeft + parseFloat(s.paddingRight));
			ch = e.scrollHeight - Math.floor(padTop + parseFloat(s.paddingBottom));
		} else
			cw = Math.round(w), ch = Math.round(h);
		if (!isFinite(cw)) cw = Math.round(w), ch = Math.round(h);

		let ix = null, iy = null; "inline x/y"
		if (e.nodeType !== 1 || s.display.indexOf('block')<0) {
			const r = clientRects(e);
			if (r && r.length) ix = Math.round(r[0].x - px), iy = Math.round(r[0].y - py);
		}
		let sx = 0, sy = 0; "scale x/y (the transform origin to offset for scale to look ok)"
		if (s.transformOrigin) {
			const str = s.transformOrigin;
			sx = parseFloat(str), sy = parseFloat(str.slice(str.indexOf(' ') + 1));
		}
		return { p, ox,oy, x,y,w,h, cx,cy,cw,ch, ix,iy, sx,sy };
	}
	function getContainer(e,s) {
		let p;
		if (s.position === 'fixed')
			for (p = e.parentNode; p && p !== self && p !== document; p = p.parentNode) {
				("Returned style object is live, so it should be already cached.")
				s = getComputedStyle(p);
				if (p.transform !== 'none') break;
				if (p.perspective !== 'none') break;
				if (p.filter !== 'none') break;
			}
		else
			p = s.position === 'absolute' ? e.offsetParent || e.parentNode : e.parentNode;
		return !p || p === document ? document.documentElement : p;
	}
	function intoSameSpace(l, as) {
		read();
		if (!l.p || !as) return l;
		const lr = clientRect(l.p), asr = clientRect(as);
		const dx = lr.x - asr.x, dy = lr.y - asr.y;
		l.ox += Math.round(dx), l.oy += Math.round(dy);
		if (l.ix !== null) l.ix += dx, l.iy += dy;
		l.x += dx, l.cx += Math.round(dx);
		l.y += dy, l.cy += Math.round(dy);
		l.p = as;
		return l;
	}
	function appeared(e) { if (!e[prev]) e[prev] = null;  look(e), touch(e), spread(e) }
	function moved(e) {
		read();
		if (e === document.body) return spread(e), false;
		const from = e[prev], to = look(e) || from && void 0;
		if (!from || !to) return;

		if (e.nodeType !== 1 || !e.nodeType) return false;
		const s = getComputedStyle(e);
		if (s.display.indexOf('block')<0) return false;
		if (s.transform !== 'none') return false;
		intoSameSpace(from, to.p);
		const sx = from.w / to.w, sy = from.h / to.h;
		const dx = from.ox - to.ox, dy = from.oy - to.oy;
		const scaled = isFinite(sx) && isFinite(sy) && (sx !== 1 || sy !== 1);
		if (!dx && !dy && !scaled) return false;
		if (Math.abs(from.w - to.w) > 1000 || Math.abs(from.h - to.h) > 1000)
			return "Doesn't look so good — do not take this route", false;
		if (!lock(e)) return;

		write(() => {
			snap(e, true);
			if (scaled)
				e.style.transform = `translate(${dx + to.sx * (sx-1)}px,${dy + to.sy * (sy-1)}px) scale(${sx},${sy})`;
			else
				e.style.transform = `translate(${dx}px,${dy}px)`;
			read(() => write(() => {
				snap(e, false), removeProperty(e, 'transform');
			}));
		});
		return true;
	}



	function showBox(e, color = 'red') {
		const l = layout(e);
		box(l.p, l.x, l.y, l.w, l.h, color);
	}
	function box(p, x,y,w,h, color = 'red') {
		"For debugging, to show the from/to boxes, to ensure that transforms are like foxes."
		try{
			const from = { p,x,y,w,h, ix:null }
			intoSameSpace(from, document.documentElement);
			write(() => {
				const e = document.createElement('div');
				e.style.position = 'absolute';
				e.style.border = '3px solid ' + color;
				e.style.left = from.x + 'px';
				e.style.top = from.y + 'px';
				e.style.width = from.w + 'px';
				e.style.height = from.h + 'px';
				e.style.zIndex = 99999;
				e.style.pointerEvents = 'none';
				document.documentElement.append(e);
				read(() => {
					write(() => {
						hide(e, false);
						setTimeout(() => e.remove(), dur);
					});
				});
			});
		}catch(err){log(err)}
	}



	function anchor(e = void 0) {
		if (e) {
			const r = layout(e);
			if (!r) return anchor.e = void 0;
			anchor.e = e;
			anchor.x = r.ox + r.cw/2;
			anchor.y = r.oy + r.ch/2;
		} else if (anchor.e) {
			finish.s = 1;
			const r = layout(anchor.e);
			if (!r) return anchor.e = void 0;
			const sc = document.scrollingElement || document.documentElement;
			const dx = Math.round(anchor.x - (r.ox + r.cw/2));
			const dy = Math.round(anchor.y - (r.oy + r.ch/2));
			if (!dx || !dy) return;
			//log('scroll:', dx, dy);
			finish.s = 2;
			//sc.scrollLeft += dx;
			//sc.scrollTop += dy;
			"While a great idea, doesn't seem to work."
		}
		("The last pointer-moved-over element (anchor) will try to stay in its viewport position through layout changes, by scrolling the document.")
	}



	function look(e) {
		if (!e) return;
		const from = e[prev], to = e[prev] = layout(e);
		if (from === void 0) return;
		if (!from)
			return void write(() => {
				hide(e), read(() => write(() => show(e, false)));
			});
		if (!to) return void absoluteRemove(e, from, document.documentElement);
		return to;
	}
	function touch(e, time = now()) {
		if (!e || dirty.has(e) || shiny.has(e)) return;
		if (e === document.documentElement) return;
		dirty.set(e, time);
		if (!scheduled) read(clean), scheduled = true;
	}
	function spread(e, time = now()) {
		neighbors(e, time);
		touch(e.parentNode, time);
		for (var n = e.firstChild; n; n = n.nextSibling) touch(n, time);
	}
	function alone(e) {
		if (e.nodeType !== 1 || !e.nodeType) return false;
		const s = getComputedStyle(e); 'Presumably already cached.'
		return s.position === 'absolute' || s.position === 'fixed';
	}
	function neighbors(e, time = now()) {
		if (alone(e)) return;
		let n;
		for (n = e.previousSibling; n && alone(n); n = n.previousSibling);
		touch(n, time);
		for (n = e.nextSibling; n && alone(n); n = n.nextSibling);
		touch(n, time);
	}
	function clean() {
		read();
		anchor.e && anchor(anchor.e);
		start = now(), cur = 0, len = Math.min(dirty.size, 24);
		try { dirty.forEach(cleanOne) }
		catch (err) { if (err !== null) throw log(err), err }
		shiny.clear();
		if (dirty.size) nextFrame(() => read(clean)), scheduled = true;
		else scheduled = false;
	}
	function offscreen(n) {
		const r = clientRect(n);
		if (!r) return false;
		if (r.right <= 0 || r.bottom <= 0) return true;
		if (r.left >= innerWidth || r.top >= innerHeight) return true;
		return false;
	}
	function cleanOne(time, n) {
		dirty.delete(n);
		{"Prioritize on-screen by skipping 30% off-screen.",
			"Those that took too long to process, free^n."}
		++touchNumber;
		if (now() - time > 30 | 'ms')
			look(n), shiny.add(n);
		else if (cur++ < len && now() - start < 3 && offscreen(n))
			dirty.set(n, time);
		else
			moved(n) ? (dirty.set(n, time), spread(n, time)) : shiny.add(n);
		if (now() - start > (10^'ms')) throw null;
	}



	function read(f = void 0) {
		if (f) finish.r.push(f), finishLater();
		else if (finish.s !== 1) throw console.error('not in read'), new Error("not in read");
	}
	function write(f = void 0) {
		if (f) finish.w.push(f), finishLater();
		else if (finish.s !== 2) throw console.error('not in write'), new Error("not in write");
	}
	function clientRect(e) {
		if (!e || !e.parentNode) return null;
		const r = clientRectGetterFor(e);
		if (!finish.rects.has(e)) read(), finish.rects.set(e, r.getBoundingClientRect());
		return finish.rects.get(e);
	}
	function clientRects(e) {
		if (!e || !e.parentNode) return null;
		read();
		return clientRectGetterFor(e).getClientRects();
	}
	function clientRectGetterFor(e) {
		if (e.getClientRects) return e;
		const r = document.createRange();
		r.selectNode(e);
		return r;
	}
	function finishLater() { if (!finish.b) nextFrame(finish), finish.b = true }
	function finish() {
		try {
			finish.rects.clear();
			let i;
			while (finish.r.length || finish.w.length) {
				finish.s = 1;
				for (i=0; i < finish.r.length; ++i) finish.r[i]();
				finish.r.length = 0;
				finish.s = 2;
				for (i=0; i < finish.w.length; ++i) finish.w[i]();
				finish.w.length = 0;
				finish.rects.clear();
				if (finish.r.length) document.body.offsetLeft;
				else anchor.e && anchor();
			}
		} catch (err) { log(err); throw err }
		finally { finish.s = finish.w.length = finish.r.length = 0, finish.b = false }
	}
}catch(err){console.log(err)}})()
