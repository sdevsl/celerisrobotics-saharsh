/* Celeris intro animation.
   Plays on the homepage once per browser session.
   To replay it while testing, add ?intro to the URL (main.html?intro). */
(function () {
    var root = document.documentElement;
    if (!root.classList.contains('intro-running')) return;

    /* ---- timing (milliseconds). Tweak these freely. ---- */
    var T = {
        start: 150,        // black screen before anything appears
        logoIn: 1000,      // wordLogo fades/blurs in
        wordsDelay: 200,   // extra wait before the side words appear
        wordsIn: 1100,     // side words settle in
        hold: 2150,        // how long everything sits still
        exit: 900,         // side words drift off + blur away
        cross: 800,        // wordLogo blurs into plainLogo
        beforeFly: 550,    // pause after exit begins, before logo flies
        fly: 1200,         // logo travels to the top-left
        bgDelay: 450,      // when the dark background starts fading (during flight)
        bgFade: 900,
        navWordsDelay: 700,
        navWordsIn: 800
    };
    var EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
    var EASE_INOUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

    var intro = document.getElementById('intro');
    var navAnims = [];

    function cleanup() {
        root.classList.remove('intro-running');
        navAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!intro || reduce || !Element.prototype.animate) {
        cleanup();
        return;
    }

    var failsafe = setTimeout(cleanup, 12000);

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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

        await Promise.all([ready(word), ready(plain), ready(navLogo)]);

        /* 1. black, then the logo blurs in */
        await sleep(T.start);
        play(word, [
            { opacity: 0, filter: 'blur(16px)', transform: 'scale(0.94)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }
        ], { duration: T.logoIn, easing: EASE_OUT });

        /* 2. side words settle in */
        await sleep(T.wordsDelay);
        play(left, [
            { opacity: 0, filter: 'blur(10px)', transform: 'translateX(36px)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' }
        ], { duration: T.wordsIn, easing: EASE_OUT });
        play(right, [
            { opacity: 0, filter: 'blur(10px)', transform: 'translateX(-36px)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' }
        ], { duration: T.wordsIn, easing: EASE_OUT });

        /* 3. hold */
        await sleep(T.hold);

        /* 4. words drift off + blur away, wordLogo blurs into plainLogo */
        play(left, [
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' },
            { opacity: 0, filter: 'blur(16px)', transform: 'translateX(-100px)' }
        ], { duration: T.exit, easing: EASE_INOUT });
        play(right, [
            { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0px)' },
            { opacity: 0, filter: 'blur(16px)', transform: 'translateX(100px)' }
        ], { duration: T.exit, easing: EASE_INOUT });
        play(word, [
            { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
            { opacity: 0, filter: 'blur(14px)', transform: 'scale(1.04)' }
        ], { duration: T.cross, easing: EASE_INOUT });
        play(plain, [
            { opacity: 0, filter: 'blur(14px)' },
            { opacity: 1, filter: 'blur(0px)' }
        ], { duration: T.cross, easing: EASE_INOUT });

        await sleep(T.beforeFly);

        /* 5. logo flies to its spot in the navbar */
        var box = logo.getBoundingClientRect();
        var target = navLogo.getBoundingClientRect();
        var aspect = plain.naturalWidth / plain.naturalHeight;
        var renderedH = aspect >= 1 ? box.width / aspect : box.height;
        var scale = target.height / renderedH;
        var dx = (target.left + target.width / 2) - (box.left + box.width / 2);
        var dy = (target.top + target.height / 2) - (box.top + box.height / 2);

        var flight = play(logo, [
            { transform: 'translate(0px, 0px) scale(1)' },
            { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')' }
        ], { duration: T.fly, easing: EASE_INOUT });

        play(bg, [{ opacity: 1 }, { opacity: 0 }],
            { duration: T.bgFade, delay: T.bgDelay, easing: 'ease' });

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
