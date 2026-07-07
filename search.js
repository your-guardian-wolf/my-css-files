document.addEventListener("DOMContentLoaded", () => {

    if (!location.pathname.startsWith("/spa/")) return;


    // =========================
    // KONFIGURACJA
    // =========================

    const dzialyFabularne = [
        "/f2"
    ];

    const postowNaStrone = 15;


    const userIdMatch =
        location.pathname.match(/\/spa\/(u\d+)/);


    if (!userIdMatch) return;


    const userId =
        userIdMatch[1];


    const bazaSPA =
        `/spa/${userId}`;


    let postyFabularne = [];
    let zaladowano = false;
    let aktualnaStronaFabula = 1;



    // =========================
    // MENU FILTRA
    // =========================

    const filtr =
        document.createElement("div");


    filtr.id =
        "filtr-postow";


    filtr.innerHTML = `

        <strong>Pokaż:</strong>

        <select id="wybor-postow">

            <option value="all">
                Wszystkie posty
            </option>

            <option value="fabula">
                Posty fabularne
            </option>

        </select>

        <span id="status-filtra"></span>

    `;



    const pageTitle =
        document.querySelector(".page-title");


    if (pageTitle) {

        pageTitle.after(filtr);

    }



    const select =
        document.getElementById("wybor-postow");


    const status =
        document.getElementById("status-filtra");





    // =========================
    // ZNAJDOWANIE STRON SPA
    // =========================

    async function pobierzStronySPA(url) {


        let strony = [
            url
        ];


        try {


            const res =
                await fetch(url);


            const html =
                await res.text();


            const doc =
                new DOMParser()
                    .parseFromString(
                        html,
                        "text/html"
                    );


            const paginacja =
                doc.querySelector(".pagination");


            if (!paginacja) {

                return strony;

            }



            let max = 0;



            paginacja
                .querySelectorAll("a")
                .forEach(a => {


                    const href =
                        a.getAttribute("href");


                    if (!href) return;



                    const match =
                        href.match(
                            /\/spa\/u\d+\/(\d+)/
                        );



                    if (match) {


                        const numer =
                            parseInt(match[1]);



                        if (numer > max) {

                            max = numer;

                        }

                    }


                });



            for (
                let i = 5;
                i <= max;
                i += 5
            ) {


                strony.push(
                    `${bazaSPA}/${i}`
                );


            }


        }
        catch(e) {

            console.error(
                "Błąd paginacji:",
                e
            );

        }



        return strony;

    }






    // =========================
    // CZY POST FABULARNY
    // =========================

    function czyFabula(post) {


        const dzial =
            post.querySelector(
                "a.postdetails.dzial"
            );


        if (!dzial) return false;



        const link =
            dzial.getAttribute("href");



        if (!link) return false;



        return dzialyFabularne.some(id =>
            link.startsWith(id)
        );

    }






    // =========================
    // ŁADOWANIE POSTÓW
    // =========================

    async function ladujPosty() {


        status.textContent =
            " - szukanie...";



        const strony =
            await pobierzStronySPA(
                bazaSPA
            );



        postyFabularne = [];



        for (const url of strony) {


            try {


                const res =
                    await fetch(url);



                const html =
                    await res.text();



                const doc =
                    new DOMParser()
                        .parseFromString(
                            html,
                            "text/html"
                        );



                doc
                    .querySelectorAll(".search.post")
                    .forEach(post => {


                        if (czyFabula(post)) {


                            postyFabularne.push(
                                post.cloneNode(true)
                            );


                        }


                    });



            }
            catch(e) {


                console.error(
                    "Błąd pobierania:",
                    url,
                    e
                );

            }


        }



        zaladowano = true;



        status.textContent =
            " znaleziono: "
            + postyFabularne.length;


        console.log(
            "Posty fabularne:",
            postyFabularne.length
        );


    }






    // =========================
    // PAGINACJA FILTRA
    // =========================

    function stworzPaginacjeFabula() {


        document
            .querySelectorAll(".fabula-pagination")
            .forEach(p => p.remove());



        const iloscStron =
            Math.ceil(
                postyFabularne.length /
                postowNaStrone
            );



        if (iloscStron <= 1) return;



        const pag =
            document.createElement("div");


        pag.className =
            "pagination fabula-pagination";



        for (
            let i = 1;
            i <= iloscStron;
            i++
        ) {


            const a =
                document.createElement("a");


            a.href = "#";

            a.textContent = i;



            if (
                i === aktualnaStronaFabula
            ) {

                a.classList.add(
                    "active"
                );

            }



            a.onclick = e => {

                e.preventDefault();


                aktualnaStronaFabula = i;


                pokazStroneFabuly();

            };



            pag.appendChild(a);

        }



        const kontener =
            document.querySelector(".search.post")
                ?.parentElement;



        if (kontener) {

            kontener.appendChild(
                pag
            );

        }

    }







    // =========================
    // RENDER STRONY FABULARNEJ
    // =========================

    function pokazStroneFabuly() {


        document
            .querySelectorAll(".fabula-render")
            .forEach(post =>
                post.remove()
            );



        const start =
            (aktualnaStronaFabula - 1)
            * postowNaStrone;



        const koniec =
            start + postowNaStrone;



        const kontener =
            document.querySelector(".search.post")
                ?.parentElement;



        if (!kontener) return;



        postyFabularne
            .slice(start, koniec)
            .forEach(post => {


                const kopia =
                    post.cloneNode(true);



                kopia.classList.add(
                    "active",
                    "fabula-render"
                );



                kontener.appendChild(
                    kopia
                );


            });



        stworzPaginacjeFabula();

    }






    // =========================
    // FILTR FABULARNY
    // =========================

    async function pokazFabularne() {


        if (!zaladowano) {

            await ladujPosty();

        }



        document
            .querySelectorAll(".search.post")
            .forEach(post => {

                post.style.display =
                    "none";

            });



        document
            .querySelectorAll(
                ".pagination:not(.fabula-pagination)"
            )
            .forEach(p => {

                p.style.display =
                    "none";

            });



        aktualnaStronaFabula = 1;


        pokazStroneFabuly();


    }






    // =========================
    // WSZYSTKIE POSTY
    // =========================

    function pokazWszystkie() {


        document
            .querySelectorAll(".fabula-render")
            .forEach(post =>
                post.remove()
            );



        document
            .querySelectorAll(".fabula-pagination")
            .forEach(p =>
                p.remove()
            );



        document
            .querySelectorAll(".search.post")
            .forEach(post => {

                post.style.display =
                    "";

            });



        document
            .querySelectorAll(".pagination")
            .forEach(p => {

                p.style.display =
                    "";

            });



        status.textContent = "";

    }






    // =========================
    // ZMIANA FILTRA
    // =========================

    select.addEventListener(
        "change",
        () => {


            if (
                select.value === "fabula"
            ) {

                pokazFabularne();

            }


            if (
                select.value === "all"
            ) {

                pokazWszystkie();

            }


        }
    );


});
