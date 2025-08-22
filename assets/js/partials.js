function loadPartial(targetSelector, url, done) {
  fetch(url, { cache: "no-cache" })
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(html => {
      document.querySelector(targetSelector).innerHTML = html;
      if (typeof done === "function") done();
    })
    .catch(err => console.error("Partial load failed:", url, err));
}

function loadNavbar(targetSelector) {
  const guesses = [
    "/assets/partials/navbar.html",
    "../assets/partials/navbar.html",
    "../../assets/partials/navbar.html",
    "assets/partials/navbar.html"
  ];
  (function tryNext(i) {
    if (i >= guesses.length) return console.error("Navbar not found via guesses:", guesses);
    loadPartial(targetSelector, guesses[i], function () {
      if (window.jQuery && typeof jQuery.fn.dropdownHover === "function") {
        jQuery('[data-hover="dropdown"]').dropdownHover();
      }
      markActiveTop();
    });
  })(0);
}


function markActiveTop() {
  const p = location.pathname.toLowerCase();

  const isAbout =
    p.includes("/about") ||
    p.includes("about.html") ||
    p.includes("board-of-governors"); 

  let top = null;
  if (isAbout) top = "about";
  else if (p.includes("program")) top = "programs";
  else if (p.includes("tournament")) top = "tournaments";
  else if (p.includes("schedule")) top = "schedule";

  if (top) {
    const li = document.querySelector('.navbar-bmhc [data-top="' + top + '"]');
    if (li) li.classList.add("active");
  }
}
