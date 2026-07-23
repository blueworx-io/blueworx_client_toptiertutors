/**
 * Top Tier Tutors — logo carousel.
 *
 * Motion is entirely JavaScript: nothing animates via CSS. The strip advances
 * one step at a time (the leading item's width plus its gap), pauses, then
 * repeats. Each item also lifts toward the top as it moves away from centre —
 * the "arc" — with its own translateY, composed alongside the track's own
 * translateX.
 *
 * Besides driving the motion, this file does what CSS cannot: fill the track
 * with enough copies to loop at any viewport width.
 */
(function () {
	'use strict';

	var ROOT_SELECTOR = '[data-ttt-marquee]';
	var DEFAULT_STEP_MS = 600;
	var DEFAULT_PAUSE_MS = 2000;
	var DEFAULT_ARC = 24;

	/**
	 * Whether the visitor has asked for reduced motion.
	 *
	 * @return {boolean} True when motion should be suppressed.
	 */
	function prefersReducedMotion() {
		return (
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	}

	/**
	 * Remove every clone from a track.
	 *
	 * @param {HTMLElement} track Track element.
	 * @return {void}
	 */
	function clearClones(track) {
		var clones = track.querySelectorAll('[data-ttt-clone="1"]');

		for (var i = 0; i < clones.length; i++) {
			clones[i].parentNode.removeChild(clones[i]);
		}
	}

	/**
	 * Clear the inline transform/transition this script may have left on an
	 * item, so cloning starts from a clean node and a relayout does not carry
	 * a stale style forward.
	 *
	 * @param {HTMLElement} item Tile element.
	 * @return {void}
	 */
	function resetItemStyle(item) {
		item.style.transform = '';
		item.style.transitionProperty = '';
		item.style.transitionDuration = '';
		item.style.transitionTimingFunction = '';
	}

	/**
	 * Width of one item as a step: its border-box width plus its trailing gap.
	 *
	 * @param {HTMLElement} item Tile element.
	 * @return {number} Width in pixels.
	 */
	function stepWidthOf(item) {
		var gap = parseFloat(window.getComputedStyle(item).marginRight) || 0;

		return item.getBoundingClientRect().width + gap;
	}

	/**
	 * Width of one full set of tiles, including each item's trailing gap.
	 *
	 * @param {Array<HTMLElement>} items Original tiles.
	 * @return {number} Width in pixels.
	 */
	function setWidth(items) {
		var total = 0;

		for (var i = 0; i < items.length; i++) {
			total += stepWidthOf(items[i]);
		}

		return total;
	}

	/**
	 * Set a track's horizontal position.
	 *
	 * @param {HTMLElement} track Track element.
	 * @param {number}      x     Offset in pixels.
	 * @return {void}
	 */
	function setTrackOffset(track, x) {
		track.style.transform = 'translateX(' + x + 'px)';
	}

	/**
	 * Force layout, so a following style change is guaranteed to transition
	 * from the value just set rather than being batched with it.
	 *
	 * @param {HTMLElement} el Element to reflow.
	 * @return {number} Its offsetWidth, read only to force the reflow.
	 */
	function forceReflow(el) {
		return el.offsetWidth;
	}

	/**
	 * Put a linear transform transition of a given duration on an element.
	 *
	 * @param {HTMLElement} el Element.
	 * @param {number}      ms Duration in milliseconds. 0 makes changes instant.
	 * @return {void}
	 */
	function setTransitionMs(el, ms) {
		el.style.transitionProperty = 'transform';
		el.style.transitionTimingFunction = 'linear';
		el.style.transitionDuration = ms + 'ms';
	}

	/**
	 * Turn transitions off on the track and every item, instantly.
	 *
	 * @param {HTMLElement}         track Track element.
	 * @param {Array<HTMLElement>} items Item elements.
	 * @return {void}
	 */
	function disableTransitions(track, items) {
		setTransitionMs(track, 0);

		for (var i = 0; i < items.length; i++) {
			setTransitionMs(items[i], 0);
		}
	}

	/**
	 * Turn transitions on for the track and every item, at the step duration.
	 *
	 * @param {HTMLElement}         track  Track element.
	 * @param {Array<HTMLElement>} items  Item elements.
	 * @param {number}              stepMs Step duration in milliseconds.
	 * @return {void}
	 */
	function enableTransitions(track, items, stepMs) {
		setTransitionMs(track, stepMs);

		for (var i = 0; i < items.length; i++) {
			setTransitionMs(items[i], stepMs);
		}
	}

	/**
	 * Compute and apply each item's arc lift for a predicted horizontal offset.
	 *
	 * `d` is the distance from the viewport's centre to the item's own centre
	 * (after `offsetPx` is applied), divided by half the viewport width and
	 * clamped to 1. Lift is `arc * d^2` — squared so the centre stays flat and
	 * the rise gathers toward the edges — applied as the item's own
	 * `translateY`. Passing the offset the slide is about to produce is what
	 * lets the lift animate together with the slide instead of afterwards.
	 *
	 * @param {Array<HTMLElement>} items        Item elements, in any order.
	 * @param {DOMRect}             viewportRect The marquee viewport's rect.
	 * @param {number}              arc          Maximum lift in px. 0 is flat.
	 * @param {number}              offsetPx     Horizontal shift the items are
	 *                                            about to end up at (0 for "as
	 *                                            they are now").
	 * @return {void}
	 */
	function applyArc(items, viewportRect, arc, offsetPx) {
		var center = viewportRect.left + viewportRect.width / 2;
		var half = viewportRect.width / 2;

		for (var i = 0; i < items.length; i++) {
			if (!arc) {
				items[i].style.transform = '';

				continue;
			}

			var rect = items[i].getBoundingClientRect();
			var itemCenter = rect.left + rect.width / 2 + offsetPx;
			var d = half ? Math.abs(center - itemCenter) / half : 0;

			if (d > 1) {
				d = 1;
			}

			var lift = arc * d * d;

			items[i].style.transform = 'translateY(-' + lift + 'px)';
		}
	}

	/**
	 * Read a marquee root's settings from its data attributes.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {Object} Settings.
	 */
	function readSettings(root) {
		var stepMs = parseFloat(root.getAttribute('data-step-ms'));
		var pauseMs = parseFloat(root.getAttribute('data-pause-ms'));
		var arcAttr = root.getAttribute('data-arc');
		var arc = arcAttr === null ? NaN : parseFloat(arcAttr);

		return {
			stepMs: isNaN(stepMs) ? DEFAULT_STEP_MS : stepMs,
			pauseMs: isNaN(pauseMs) ? DEFAULT_PAUSE_MS : pauseMs,
			arc: isNaN(arc) ? DEFAULT_ARC : arc,
			direction: 'right' === root.getAttribute('data-direction') ? 'right' : 'left',
			pauseOnHover: '1' === root.getAttribute('data-pause-on-hover'),
		};
	}

	/**
	 * Call back once on a track's next transform transitionend, with a
	 * fallback timer so a transition that never actually changes anything
	 * (and so never fires transitionend) cannot stall the loop.
	 *
	 * @param {HTMLElement} track    Track element.
	 * @param {number}      stepMs   Step duration in milliseconds.
	 * @param {Function}    callback Called exactly once.
	 * @return {void}
	 */
	function onStepTransitionEnd(track, stepMs, callback) {
		var done = false;
		var timeoutId;

		var finish = function () {
			if (done) {
				return;
			}

			done = true;
			track.removeEventListener('transitionend', onEnd);
			window.clearTimeout(timeoutId);
			callback();
		};

		var onEnd = function (event) {
			if (event.target === track && 'transform' === event.propertyName) {
				finish();
			}
		};

		track.addEventListener('transitionend', onEnd);
		timeoutId = window.setTimeout(finish, stepMs + 50);
	}

	/**
	 * Schedule the next step after the dwell, unless one is already scheduled,
	 * running, or the strip is currently paused by hover/focus.
	 *
	 * @param {HTMLElement} root  Marquee root.
	 * @param {Object}      state Per-root running state.
	 * @return {void}
	 */
	function scheduleNext(root, state) {
		if (state.destroyed || state.timer || state.hovered) {
			return;
		}

		state.timer = window.setTimeout(function () {
			state.timer = null;
			performStep(root, state);
		}, state.settings.pauseMs);
	}

	/**
	 * Perform one step: advance the track by a leading (or trailing) item's
	 * width, recycling that item to the other end, with the arc animating
	 * alongside the slide.
	 *
	 * @param {HTMLElement} root  Marquee root.
	 * @param {Object}      state Per-root running state.
	 * @return {void}
	 */
	function performStep(root, state) {
		if (state.destroyed) {
			return;
		}

		var track = root.querySelector('.ttt-marquee__track');
		var viewport = root.querySelector('.ttt-marquee__viewport');

		if (!track || !viewport) {
			return;
		}

		var items = [].slice.call(track.children);

		if (items.length < 2) {
			scheduleNext(root, state);

			return;
		}

		var settings = state.settings;

		state.midStep = true;

		if ('right' === settings.direction) {
			// Mirrors the left case: the recycle-and-instant-reposition happens
			// first (invisibly), then the track transitions to reveal it.
			var lastItem = items[items.length - 1];
			var lastWidth = stepWidthOf(lastItem);

			disableTransitions(track, items);
			track.insertBefore(lastItem, track.firstChild);
			setTrackOffset(track, -lastWidth);
			forceReflow(track);

			var itemsAfterInsert = [].slice.call(track.children);

			enableTransitions(track, itemsAfterInsert, settings.stepMs);
			applyArc(itemsAfterInsert, viewport.getBoundingClientRect(), settings.arc, lastWidth);
			setTrackOffset(track, 0);

			onStepTransitionEnd(track, settings.stepMs, function () {
				state.midStep = false;
				scheduleNext(root, state);
			});
		} else {
			var leadingItem = items[0];
			var stepPx = stepWidthOf(leadingItem);

			applyArc(items, viewport.getBoundingClientRect(), settings.arc, -stepPx);
			setTrackOffset(track, -stepPx);

			onStepTransitionEnd(track, settings.stepMs, function () {
				if (state.destroyed) {
					return;
				}

				disableTransitions(track, items);
				track.appendChild(leadingItem);
				setTrackOffset(track, 0);

				var itemsAfterRecycle = [].slice.call(track.children);

				applyArc(itemsAfterRecycle, viewport.getBoundingClientRect(), settings.arc, 0);
				forceReflow(track);
				enableTransitions(track, itemsAfterRecycle, settings.stepMs);

				state.midStep = false;
				scheduleNext(root, state);
			});
		}
	}

	/**
	 * Attach the pointer/focus listeners that pause stepping. Attached once
	 * per root and reads the root's current state on every event, so it keeps
	 * working across relayouts without being reattached.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {void}
	 */
	function attachHoverPause(root) {
		var pointerOver = false;
		var focusWithin = false;

		var refresh = function () {
			var state = root.tttState;

			if (!state || !state.settings.pauseOnHover) {
				return;
			}

			var next = pointerOver || focusWithin;

			if (next === state.hovered) {
				return;
			}

			state.hovered = next;

			if (next) {
				if (state.timer) {
					window.clearTimeout(state.timer);
					state.timer = null;
				}
			} else if (!state.midStep) {
				scheduleNext(root, state);
			}
		};

		root.addEventListener('mouseenter', function () {
			pointerOver = true;
			refresh();
		});

		root.addEventListener('mouseleave', function () {
			pointerOver = false;
			refresh();
		});

		root.addEventListener('focusin', function () {
			focusWithin = true;
			refresh();
		});

		root.addEventListener('focusout', function () {
			// Deferred so document.activeElement reflects where focus landed.
			window.setTimeout(function () {
				focusWithin = root.contains(document.activeElement);
				refresh();
			}, 0);
		});
	}

	/**
	 * Build the track out and start (or restart) the stepping loop.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {void}
	 */
	function layout(root) {
		var track = root.querySelector('.ttt-marquee__track');
		var viewport = root.querySelector('.ttt-marquee__viewport');

		if (!track || !viewport) {
			return;
		}

		root.style.setProperty('--ttt-vw', document.documentElement.clientWidth + 'px');

		// A relayout — a repeated init() call — must not leave the previous
		// loop's pending timer or in-flight transitionend callback still able
		// to act on state this call is about to replace.
		var previous = root.tttState;

		if (previous) {
			previous.destroyed = true;

			if (previous.timer) {
				window.clearTimeout(previous.timer);
			}
		}

		root.tttState = null;

		clearClones(track);

		var originals = [].slice.call(track.children);

		for (var o = 0; o < originals.length; o++) {
			resetItemStyle(originals[o]);
		}

		track.style.transform = '';
		track.style.transitionProperty = '';
		track.style.transitionDuration = '';
		track.style.transitionTimingFunction = '';

		// Reduced motion never steps, so cloning would only duplicate content.
		// The viewport scrolls instead, and Safari will not focus a scroll
		// container unless it is given a tabindex.
		if (prefersReducedMotion()) {
			viewport.setAttribute('tabindex', '0');

			return;
		}

		viewport.removeAttribute('tabindex');

		if (!originals.length) {
			return;
		}

		var oneSet = setWidth(originals);

		if (!oneSet) {
			return;
		}

		// Enough copies to cover twice the viewport. Real rotation recycles
		// tiles rather than looping a percentage shift, so — unlike the old
		// marquee — the copy count no longer needs to be even.
		var copies = Math.max(1, Math.ceil(Math.max(viewport.clientWidth * 2, oneSet * 2) / oneSet));

		for (var copy = 1; copy < copies; copy++) {
			for (var i = 0; i < originals.length; i++) {
				var clone = originals[i].cloneNode(true);

				clone.setAttribute('data-ttt-clone', '1');
				clone.setAttribute('aria-hidden', 'true');

				var focusable = clone.querySelectorAll('a, button, input, select, textarea, [tabindex]');

				for (var f = 0; f < focusable.length; f++) {
					focusable[f].setAttribute('tabindex', '-1');
				}

				track.appendChild(clone);
			}
		}

		var settings = readSettings(root);
		var allItems = [].slice.call(track.children);

		enableTransitions(track, allItems, settings.stepMs);
		setTrackOffset(track, 0);
		applyArc(allItems, viewport.getBoundingClientRect(), settings.arc, 0);

		var state = {
			settings: settings,
			timer: null,
			midStep: false,
			hovered: false,
			destroyed: false,
		};

		root.tttState = state;

		scheduleNext(root, state);
	}

	/**
	 * Initialise one marquee, and keep it correct as things resize.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {void}
	 */
	function init(root) {
		if (!root) {
			return;
		}

		// Listeners attach once, but the layout always re-runs. A second init()
		// — the Elementor editor redrawing a widget in place — must reflect
		// whatever changed rather than silently doing nothing.
		if (root.getAttribute('data-ttt-ready') !== '1') {
			root.setAttribute('data-ttt-ready', '1');

			var relayout = function () {
				layout(root);
			};

			// Images have no measurable width until they load.
			var images = root.querySelectorAll('img');

			for (var i = 0; i < images.length; i++) {
				if (!images[i].complete) {
					images[i].addEventListener('load', relayout);
					images[i].addEventListener('error', relayout);
				}
			}

			if (typeof window.ResizeObserver === 'function') {
				var frame = null;
				var observer = new window.ResizeObserver(function () {
					if (frame) {
						window.cancelAnimationFrame(frame);
					}

					frame = window.requestAnimationFrame(relayout);
				});

				observer.observe(root);
			} else {
				window.addEventListener('resize', relayout);
			}

			attachHoverPause(root);
		}

		layout(root);
	}

	/**
	 * Initialise every marquee in a container.
	 *
	 * @param {ParentNode} [scope] Container, defaults to the document.
	 * @return {void}
	 */
	function initAll(scope) {
		var roots = (scope || document).querySelectorAll(ROOT_SELECTOR);

		for (var i = 0; i < roots.length; i++) {
			init(roots[i]);
		}
	}

	// Exposed so the Elementor editor can re-initialise a widget it just redrew.
	window.tttMarquee = { init: init, initAll: initAll };

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			initAll();
		});
	} else {
		initAll();
	}
})();
