/* Celeris intro animation.
   Plays when the homepage is first opened and on every reload.
   (It is skipped when someone arrives by clicking "Home" from another page.)
   The play/skip decision is made by the small script in <head> of main.html. */
(function () {
    var root = document.documentElement;
    if (!root.classList.contains('intro-running')) return;

    /* ---- timing (milliseconds). Tweak these freely. ---- */
    var T = {
        start: 200,         // black screen before anything appears
        logoIn: 1400,       // wordLogo blurs/fades in
        wordsDelay: 250,    // extra wait before the side words appear
        wordsIn: 1500,      // side words settle in
        hold: 1700,         // how long everything sits still
        exit: 1300,         // side words drift off + blur away
        cross: 1200,        // wordLogo blurs into plainLogo
        beforeFly: 550,     // logo starts travelling while the words are still leaving
        fly: 1700,          // logo travels to the top-left
        bgDelay: 500,       // when the dark background starts fading (during flight)
        bgFade: 1300,
        navWordsDelay: 1000,
        navWordsIn: 1000
    };

    /* soft, continuous easing curves (no abrupt starts or stops) */
    var EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var EASE_SOFT = 'cubic-bezier(0.45, 0, 0.15, 1)';
    var EASE_FLY = 'cubic-bezier(0.65, 0, 0.2, 1)';

    var intro = document.getElementById('intro');
    var navAnims = [];

    function cleanup() {
        root.classList.remove('intro-running');
        root.classList.remove('intro-reveal');
        navAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!intro || reduce || !Element.prototype.animate) {
        cleanup();
        return;
    }

    var failsafe = setTimeout(cleanup, 14000);

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function nextFrame() {
        return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    }

    function ready(img) {
        if (img.decode) return img.decode();
        return new Promise(function (res, rej) {
            if (img.complete && img.naturalWidth) return res();
            img.onload = res;
            img.onerror = rej;
        });
    }

    function play(el, frames, opts) {
        opts.fill = 'forwards';
        return el.animate(frames, opts);
    }

    async function run() {
        var bg = intro.querySelector('.intro-bg');
        var left = intro.querySelector('.intro-word-left');
        var right = intro.querySelector('.intro-word-right');
        var logo = intro.querySelector('.intro-logo');
        var word = intro.querySelector('.intro-logo-word');
        var plain = intro.querySelector('.intro-logo-plain');
        var navLogo = document.getElementById('nav-logo');
        var navWords = Array.prototype.slice.call(document.querySelectorAll('.nav-word'));

        /* load and decode every image first so nothing hitches mid-animation */
        await Promise.all([ready(word), ready(plain), ready(navLogo)]);
        await nextFrame();

        /* 1. black, then the logo blurs in */
        await sleep(T.start);
        play(word, [
            { opacity: 0, filter: 'blur(12px)', transform: 'scale(0.95)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }
        ], { duration: T.logoIn, easing: EASE_OUT });

        /* 2. side words settle in */
        await sleep(T.wordsDelay);
        play(left, [
            { opacity: 0, filter: 'blur(8px)', transform: 'translateX(40px)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' }
        ], { duration: T.wordsIn, easing: EASE_OUT });
        play(right, [
            { opacity: 0, filter: 'blur(8px)', transform: 'translateX(-40px)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' }
        ], { duration: T.wordsIn, easing: EASE_OUT });

        /* 3. hold */
        await sleep(T.hold);

        /* 4. words drift off + blur away, wordLogo blurs into plainLogo */
        play(left, [
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' },
            { opacity: 0, filter: 'blur(12px)', transform: 'translateX(-110px)' }
        ], { duration: T.exit, easing: EASE_SOFT });
        play(right, [
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' },
            { opacity: 0, filter: 'blur(12px)', transform: 'translateX(110px)' }
        ], { duration: T.exit, easing: EASE_SOFT });
        play(word, [
            { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
            { opacity: 0, filter: 'blur(10px)', transform: 'scale(1.03)' }
        ], { duration: T.cross, easing: 'ease-in-out' });
        play(plain, [
            { opacity: 0, filter: 'blur(10px)' },
            { opacity: 1, filter: 'blur(0px)' }
        ], { duration: T.cross, easing: 'ease-in-out' });

        await sleep(T.beforeFly);

        /* 5. logo glides to its spot in the navbar */
        var box = logo.getBoundingClientRect();
        var target = navLogo.getBoundingClientRect();
        var aspect = plain.naturalWidth / plain.naturalHeight;
        var renderedH = aspect >= 1 ? box.width / aspect : box.height;
        var scale = target.height / renderedH;
        var dx = (target.left + target.width / 2) - (box.left + box.width / 2);
        var dy = (target.top + target.height / 2) - (box.top + box.height / 2);

        var flight = play(logo, [
            { transform: 'translate3d(0px, 0px, 0) scale(1)' },
            { transform: 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale(' + scale + ')' }
        ], { duration: T.fly, easing: EASE_FLY });

        play(bg, [{ opacity: 1 }, { opacity: 0 }],
            { duration: T.bgFade, delay: T.bgDelay, easing: 'ease-in-out' });

        /* as the dark background starts to fade, let the homepage title rise into place */
        setTimeout(function () { root.classList.add('intro-reveal'); }, T.bgDelay + 250);

        navWords.forEach(function (w) {
            navAnims.push(play(w, [
                { opacity: 0, filter: 'blur(8px)' },
                { opacity: 1, filter: 'blur(0px)' }
            ], { duration: T.navWordsIn, delay: T.navWordsDelay, easing: EASE_OUT }));
        });

        await flight.finished;

        /* 6. hand the logo over to the real navbar image */
        navLogo.style.visibility = 'visible';
        logo.style.visibility = 'hidden';
        await Promise.all(navAnims.map(function (a) { return a.finished; }));
    }

    run().catch(function () {}).then(function () {
        clearTimeout(failsafe);
        cleanup();
    });
})();
