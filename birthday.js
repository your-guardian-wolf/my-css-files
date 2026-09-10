document.addEventListener('DOMContentLoaded', function () {

    const START_HP = 1000;

    const TASK_DAMAGE = {
        1: 50,
        2: 50,
        3: 100,
        5: 50,
        6: 50,
        7: 100,
        9: 50,
        10: 50,
        11: 100
    };

    const SKILL_BONUS = {
        podstawowy: 5,
        średniozaawansowany: 15,
        zaawansowany: 25,
        mistrzowski: 45
    };

    const DICE_STORAGE_KEY = 'dice_transfer_v5';
    const CACHE_PREFIX = 'pinata_cache_';
    const CACHE_TIME = 30000;
    const REQUEST_DELAY = 800;

    const POST_SELECTOR =
        '.post, .search.post, .fabula-render';

    const visiblePosts =
        Array.from(
            document.querySelectorAll(POST_SELECTOR)
        ).filter(function (post) {
            return post.dataset.fakePost !== '1';
        });

    if (!visiblePosts.length) return;

    const pinataPost =
        visiblePosts.find(function (post) {
            return post.querySelector('.piniata');
        });

    if (!pinataPost) return;

    const pinata =
        pinataPost.querySelector('.piniata');

    let panel =
        pinata.querySelector('.pinata-panel');

    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'pinata-panel';
        pinata.prepend(panel);
    }

    function getContent(post) {

        return (
            post.querySelector('.content') ||
            post.querySelector('.postbody') ||
            post.querySelector('.message') ||
            post
        );
    }

    function getText(post) {

        const content = getContent(post);

        if (!content) return '';

        const clone =
            content.cloneNode(true);

        clone.querySelectorAll(
            '.quote, blockquote, .quotecontent'
        ).forEach(function (element) {
            element.remove();
        });

        return (clone.textContent || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getTaskNumber(post) {

        const text = getText(post);

        const match =
            text.match(
                /(?:^|\s)ZADANIE\s*:\s*(\d+)/i
            );

        return match
            ? Number(match[1])
            : null;
    }

    function getActionNumber(post) {

        const text = getText(post);

        const match =
            text.match(
                /(?:^|\s)AKCJA\s*:\s*(\d+)/i
            );

        return match
            ? Number(match[1])
            : null;
    }

    function getSkillLevel(post) {

        const text =
            getText(post).toLowerCase();

        if (
            text.includes('średniozaawansowany')
        ) {
            return 'średniozaawansowany';
        }

        if (
            text.includes('mistrzowski')
        ) {
            return 'mistrzowski';
        }

        if (
            text.includes('zaawansowany')
        ) {
            return 'zaawansowany';
        }

        if (
            text.includes('podstawowy')
        ) {
            return 'podstawowy';
        }

        return null;
    }

    function hasExecution(post) {

        const content = getContent(post);

        if (!content) return false;

        const html =
            content.innerHTML || '';

        const match =
            html.match(
                /<strong[^>]*>\s*WYKONANIE\s*:\s*<\/strong>/i
            );

        if (!match) return false;

        const after =
            html.substring(
                match.index + match[0].length
            );

        const nextLabel =
            after.search(
                /<strong[^>]*>\s*(?:ZADANIE|AKCJA|POZIOM)\s*:/i
            );

        const execution =
            nextLabel >= 0
                ? after.substring(0, nextLabel)
                : after;

        if (
            /<a\b[^>]*href\s*=/i.test(execution)
        ) {
            return true;
        }

        if (
            /<img\b/i.test(execution) ||
            /<iframe\b/i.test(execution) ||
            /<video\b/i.test(execution) ||
            /<audio\b/i.test(execution)
        ) {
            return true;
        }

        const plain =
            execution
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/gi, ' ')
                .trim();

        return plain.length > 0;
    }

    function isDicePost(post) {

        const text =
            getText(post);

        return (
            text.includes('Dices') &&
            text.includes('roll')
        );
    }

    function getRollFromHTML(html) {

        if (!html) return null;

        const temp =
            document.createElement('div');

        temp.innerHTML = html;

        const values =
            Array.from(
                temp.querySelectorAll(
                    '.dice-body strong'
                )
            );

        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const value =
                values[i]
                    .textContent
                    .trim();

            if (!/^\d+$/.test(value)) {
                continue;
            }

            const number =
                Number(value);

            if (
                number >= 1 &&
                number <= 100
            ) {
                return number;
            }
        }

        return null;
    }

    function loadDiceState() {

        try {

            const raw =
                localStorage.getItem(
                    DICE_STORAGE_KEY
                );

            if (!raw) return [];

            const state =
                JSON.parse(raw);

            if (
                !state ||
                !Array.isArray(state.items)
            ) {
                return [];
            }

            return state.items;

        } catch (error) {

            return [];
        }
    }

    function getRollFromLivePost(post) {

        const result =
            post.querySelector(
                '.merged-dice-result'
            );

        if (!result) return null;

        return getRollFromHTML(
            result.outerHTML
        );
    }

    function buildDiceMap(pages) {

        const diceItems =
            loadDiceState();

        const diceById =
            new Map();

        diceItems.forEach(function (item) {

            if (
                !item ||
                !item.key ||
                !item.html
            ) {
                return;
            }

            const roll =
                getRollFromHTML(
                    item.html
                );

            if (roll === null) return;

            const id =
                item.key.replace(
                    /^dice_/,
                    ''
                );

            diceById.set(
                id,
                roll
            );
        });

        const rolls =
            new Map();

        pages.forEach(function (page) {

            const posts =
                Array.from(
                    page.doc.querySelectorAll(
                        POST_SELECTOR
                    )
                ).filter(function (post) {

                    return (
                        post.dataset.fakePost !==
                        '1'
                    );

                });

            let previousPost = null;

            posts.forEach(function (post) {

                if (!post.id) return;

                if (isDicePost(post)) {

                    let roll =
                        diceById.get(
                            post.id
                        );

                    if (
                        roll === undefined
                    ) {
                        roll =
                            getRollFromLivePost(
                                post
                            );
                    }

                    if (
                        roll !== null &&
                        roll !== undefined &&
                        previousPost &&
                        previousPost.id
                    ) {

                        rolls.set(
                            previousPost.id,
                            roll
                        );
                    }

                    return;
                }

                previousPost = post;
            });
        });

        return rolls;
    }

    function getRoll(post, diceMap) {

        const live =
            getRollFromLivePost(
                post
            );

        if (live !== null) {
            return live;
        }

        if (
            post.id &&
            diceMap.has(post.id)
        ) {
            return diceMap.get(
                post.id
            );
        }

        return null;
    }

    function getActionResult(
        post,
        diceMap
    ) {

        const action =
            getActionNumber(post);

        if (action === null) {
            return null;
        }

        const roll =
            getRoll(
                post,
                diceMap
            );

        if (roll === null) {

            return {
                action: action,
                checked: false,
                success: false
            };
        }

        const level =
            getSkillLevel(post);

        const bonus =
            level
                ? SKILL_BONUS[level]
                : 0;

        const finalResult =
            roll + bonus;

        return {

            action: action,
            checked: true,
            roll: roll,
            level: level,
            bonus: bonus,
            final: finalResult,

            success:
                finalResult >= 51
        };
    }

    function getTopicId() {

        const match =
            window.location.pathname.match(
                /\/t(\d+)/
            );

        return match
            ? match[1]
            : 'unknown';
    }

    function getFirstPageUrl() {

        const url =
            new URL(
                window.location.href
            );

        url.pathname =
            url.pathname.replace(
                /(\/t\d+)p\d+/,
                '$1'
            );

        url.searchParams.delete(
            'start'
        );

        return url.href;
    }

    function getPageStart(url) {

        const match =
            url.pathname.match(
                /\/t\d+p(\d+)/
            );

        if (match) {
            return Number(match[1]);
        }

        const start =
            url.searchParams.get(
                'start'
            );

        if (start !== null) {
            return Number(start) || 0;
        }

        return 0;
    }

    function sameTopic(url) {

        const current =
            window.location.pathname.match(
                /\/t(\d+)/
            );

        const target =
            url.pathname.match(
                /\/t(\d+)/
            );

        if (!current || !target) {
            return false;
        }

        return current[1] === target[1];
    }

    function getPaginationLinks(
        doc,
        sourceUrl
    ) {

        const links =
            Array.from(
                doc.querySelectorAll(
                    'a[href]'
                )
            );

        const result =
            new Map();

        links.forEach(function (link) {

            try {

                const url =
                    new URL(
                        link.href,
                        sourceUrl
                    );

                if (
                    url.origin !==
                    window.location.origin
                ) {
                    return;
                }

                if (
                    !sameTopic(url)
                ) {
                    return;
                }

                const start =
                    getPageStart(url);

                result.set(
                    start,
                    url.href
                );

            } catch (error) {}

        });

        return Array.from(
            result.entries()
        );
    }

    function wait(ms) {

        return new Promise(
            function (resolve) {
                setTimeout(
                    resolve,
                    ms
                );
            }
        );
    }

    async function fetchPage(url) {

        if (
            url ===
            window.location.href
        ) {
            return document.cloneNode(true);
        }

        const response =
            await fetch(
                url,
                {
                    credentials:
                        'same-origin',
                    cache: 'no-store'
                }
            );

        if (!response.ok) {

            throw new Error(
                'HTTP ' +
                response.status
            );
        }

        const html =
            await response.text();

        return new DOMParser()
            .parseFromString(
                html,
                'text/html'
            );
    }

    function saveCache(
        topicId,
        pages
    ) {

        try {

            const data = {

                timestamp:
                    Date.now(),

                pages:
                    pages.map(function (page) {

                        return {
                            url: page.url,
                            html:
                                page.doc.documentElement
                                    .outerHTML
                        };

                    })

            };

            sessionStorage.setItem(
                CACHE_PREFIX + topicId,
                JSON.stringify(data)
            );

        } catch (error) {}
    }

    function loadCache(topicId) {

        try {

            const raw =
                sessionStorage.getItem(
                    CACHE_PREFIX + topicId
                );

            if (!raw) return null;

            const data =
                JSON.parse(raw);

            if (
                !data ||
                !data.timestamp ||
                !Array.isArray(data.pages)
            ) {
                return null;
            }

            if (
                Date.now() -
                data.timestamp >
                CACHE_TIME
            ) {
                return null;
            }

            return data.pages.map(
                function (page) {

                    return {

                        url:
                            page.url,

                        doc:
                            new DOMParser()
                                .parseFromString(
                                    page.html,
                                    'text/html'
                                )

                    };

                }
            );

        } catch (error) {

            return null;
        }
    }

    async function collectPages() {

        const topicId =
            getTopicId();

        const cached =
            loadCache(
                topicId
            );

        if (cached) {

            return cached;
        }

        const pages =
            new Map();

        const queue =
            new Map();

        const firstUrl =
            getFirstPageUrl();

        queue.set(
            0,
            firstUrl
        );

        const visited =
            new Set();

        while (
            queue.size > 0
        ) {

            const entries =
                Array.from(
                    queue.entries()
                ).sort(
                    function (a, b) {
                        return a[0] - b[0];
                    }
                );

            queue.clear();

            for (
                let i = 0;
                i < entries.length;
                i++
            ) {

                const start =
                    entries[i][0];

                const url =
                    entries[i][1];

                if (
                    visited.has(url)
                ) {
                    continue;
                }

                visited.add(url);

                try {

                    const doc =
                        await fetchPage(
                            url
                        );

                    pages.set(
                        start,
                        {
                            url: url,
                            doc: doc
                        }
                    );

                    const links =
                        getPaginationLinks(
                            doc,
                            url
                        );

                    links.forEach(
                        function (link) {

                            const linkStart =
                                link[0];

                            const linkUrl =
                                link[1];

                            if (
                                !visited.has(
                                    linkUrl
                                ) &&
                                !pages.has(
                                    linkStart
                                )
                            ) {

                                queue.set(
                                    linkStart,
                                    linkUrl
                                );
                            }

                        }
                    );

                    if (
                        i <
                        entries.length - 1 ||
                        queue.size > 0
                    ) {

                        await wait(
                            REQUEST_DELAY
                        );
                    }

                } catch (error) {

                    console.error(
                        'PINIATA — błąd pobierania:',
                        url,
                        error
                    );
                }
            }
        }

        const result =
            Array.from(
                pages.values()
            ).sort(
                function (a, b) {

                    return (
                        getPageStart(
                            new URL(a.url)
                        ) -
                        getPageStart(
                            new URL(b.url)
                        )
                    );

                }
            );

        if (result.length) {

            saveCache(
                topicId,
                result
            );
        }

        return result;
    }

    function collectPosts(pages) {

        const posts =
            new Map();

        pages.forEach(
            function (page) {

                const pagePosts =
                    Array.from(
                        page.doc.querySelectorAll(
                            POST_SELECTOR
                        )
                    ).filter(
                        function (post) {

                            return (
                                post.dataset.fakePost !==
                                '1'
                            );

                        }
                    );

                pagePosts.forEach(
                    function (post) {

                        if (!post.id) {
                            return;
                        }

                        if (
                            !posts.has(post.id)
                        ) {

                            posts.set(
                                post.id,
                                post
                            );
                        }

                    }
                );

            }
        );

        return Array.from(
            posts.values()
        );
    }

    function calculate(
        posts,
        diceMap
    ) {

        let hp =
            START_HP;

        let nextTask =
            1;

        let nextAction =
            1;

        let waitingForAction =
            false;

        posts.forEach(
            function (post) {

                if (
                    post.id ===
                    pinataPost.id
                ) {
                    return;
                }

                const task =
                    getTaskNumber(post);

                if (
                    task !== null
                ) {

                    if (
                        waitingForAction
                    ) {
                        return;
                    }

                    if (
                        task !== nextTask
                    ) {
                        return;
                    }

                    if (
                        !hasExecution(post)
                    ) {
                        return;
                    }

                    const damage =
                        TASK_DAMAGE[task];

                    if (!damage) {
                        return;
                    }

                    hp -= damage;

                    nextTask++;

                    if (
                        nextTask === 4 ||
                        nextTask === 8 ||
                        nextTask === 12
                    ) {

                        waitingForAction =
                            true;
                    }

                    return;
                }

                const action =
                    getActionNumber(post);

                if (
                    action === null
                ) {
                    return;
                }

                if (
                    !waitingForAction
                ) {
                    return;
                }

                if (
                    action !== nextAction
                ) {
                    return;
                }

                const result =
                    getActionResult(
                        post,
                        diceMap
                    );

                if (
                    !result ||
                    !result.checked
                ) {
                    return;
                }

                if (
                    result.success
                ) {

                    nextAction++;

                    waitingForAction =
                        false;

                    nextTask++;

                    const livePost =
                        document.getElementById(
                            post.id
                        );

                    if (livePost) {

                        const liveContent =
                            getContent(
                                livePost
                            );

                        if (
                            liveContent &&
                            !liveContent.querySelector(
                                '.sukces'
                            )
                        ) {

                            liveContent.insertAdjacentHTML(
                                'beforeend',
                                '<div class="sukces">AKCJA WYKONANA!</div>'
                            );
                        }
                    }
                }

            }
        );

        return {

            hp:
                Math.max(
                    0,
                    hp
                ),

            nextTask:
                nextTask,

            nextAction:
                nextAction,

            waitingForAction:
                waitingForAction
        };
    }

    function render(result) {

        const percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    result.hp /
                    START_HP *
                    100
                )
            );

        let status;

        if (
            result.hp <= 0
        ) {

            status =
                '<strong>PINIATA ROZBITA!</strong>';

        } else if (
            result.waitingForAction
        ) {

            status =
                'Następna akcja: <strong>' +
                result.nextAction +
                '</strong>';

        } else {

            status =
                'Następne zadanie: <strong>' +
                result.nextTask +
                '</strong>';
        }

        panel.innerHTML =

            '<div class="pinata-image">????</div>' +

            '<div class="pinata-title">' +
                'PINIATA' +
            '</div>' +

            '<div class="pinata-hp">' +

                '<div class="pinata-hp-bar">' +

                    '<div class="pinata-hp-fill" ' +
                    'style="width:' +
                    percentage +
                    '%">' +
                    '</div>' +

                '</div>' +

                '<div class="pinata-hp-number">' +
                    result.hp +
                    ' / ' +
                    START_HP +
                    ' HP' +
                '</div>' +

            '</div>' +

            '<div class="pinata-status">' +
                status +
            '</div>';
    }

    async function run() {

        panel.innerHTML =
            '<div class="pinata-loading">' +
            'Ładowanie piniaty...' +
            '</div>';

        try {

            const pages =
                await collectPages();

            const posts =
                collectPosts(
                    pages
                );

            const diceMap =
                buildDiceMap(
                    pages
                );

            const result =
                calculate(
                    posts,
                    diceMap
                );

            console.log(
                'PINIATA — stron:',
                pages.length
            );

            console.log(
                'PINIATA — postów:',
                posts.length
            );

            console.log(
                'PINIATA — rzuty:',
                diceMap
            );

            console.log(
                'PINIATA — wynik:',
                result
            );

            render(
                result
            );

        } catch (error) {

            console.error(
                'PINIATA — BŁĄD:',
                error
            );

            panel.innerHTML =
                '<div class="pinata-loading">' +
                'Nie udało się załadować piniaty.' +
                '</div>';
        }
    }

    run();

});
