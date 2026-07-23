/**
 * Top Tier Tutors — logo marquee.
 *
 * The animation itself is CSS. This file does the two things CSS cannot: fill
 * the track with enough copies to loop seamlessly at any viewport width, and
 * convert a speed in pixels per second into an animation duration.
 */
(function () {
	'use strict';

	var ROOT_SELECTOR = '[data-ttt-marquee]';
	var DEFAULT_SPEED = 60;

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
	 * Width of one full set of tiles, including the trailing gap.
	 *
	 * @param {Array<HTMLElement>} items Original tiles.
	 * @return {number} Width in pixels.
	 */
	function setWidth(items) {
		var total = 0;

		for (var i = 0; i < items.length; i++) {
			var gap = parseFloat(window.getComputedStyle(items[i]).marginRight) || 0;
			total += items[i].getBoundingClientRect().width + gap;
		}

		return total;
	}

	/**
	 * Build the track out and set the animation duration.
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

		clearClones(track);
		track.style.width = '';

		// Reduced motion never animates, so cloning would only duplicate content.
		if (prefersReducedMotion()) {
			return;
		}

		var originals = [].slice.call(track.children);

		if (!originals.length) {
			return;
		}

		var oneSet = setWidth(originals);

		if (!oneSet) {
			return;
		}

		// Enough copies to cover twice the viewport, rounded up to an even number
		// so that a -50% shift lands exactly on a copy boundary.
		var copies = Math.ceil(Math.max(viewport.clientWidth * 2, oneSet * 2) / oneSet);

		if (copies % 2 === 1) {
			copies += 1;
		}

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

		// Set explicitly so the -50% keyframe is exact rather than depending on
		// how the browser resolves max-content with trailing margins.
		var trackWidth = oneSet * copies;
		track.style.width = trackWidth + 'px';

		var speed = parseFloat(root.getAttribute('data-speed')) || DEFAULT_SPEED;
		root.style.setProperty('--ttt-marquee-duration', trackWidth / 2 / speed + 's');
	}

	/**
	 * Initialise one marquee, and keep it correct as things resize.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {void}
	 */
	function init(root) {
		if (!root || root.getAttribute('data-ttt-ready') === '1') {
			return;
		}

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
