(function () {

  // =========================================================
  // MyOpenMath iframe resizing
  // =========================================================

  window.addEventListener("message", function (e) {
    if (typeof e.data !== "string" || !e.data.includes("lti.frameResize")) {
      return;
    }

    try {
      var payload = JSON.parse(e.data);

      if (!payload || !payload.frame_id) return;

      var id = String(payload.frame_id);
      var iframe = document.getElementById(id);
      var wrapper = document.getElementById(id + "wrap");

      if (iframe && payload.height) {
        iframe.style.height = payload.height + "px";
      }

      if (wrapper && payload.wrapheight) {
        wrapper.style.height = payload.wrapheight + "px";
      }

    } catch (_) {
      // Ignore messages that are not valid JSON
    }
  });


  // =========================================================
  // Section sequence
  // =========================================================

  var sections = [
    "1.1", "1.2", "1.3",
    "2.1", "2.2", "2.3", "2.4", "2.5", "2.6",
    "3.1", "3.2", "3.3",
    "4.1", "4.2", "4.3", "4.4",
    "5.1", "5.2", "5.3", "5.4", "5.5"
  ];


  // =========================================================
  // Navigation at top of practice pages
  // =========================================================

  function injectPracticeNav() {
    var filename = window.location.pathname.split("/").pop();
    var match = filename.match(/^(\d+\.\d+)-practice\.html$/);

    if (!match) return;

    var section = match[1];

    var nav = document.createElement("nav");
    nav.className = "practice-nav-container";
    nav.setAttribute("aria-label", "Practice navigation");

    nav.innerHTML = `
      <a class="practice-button" href="${section}.html">
        Section ${section}
      </a>

      <a class="practice-button" href="practice.html">
        All Practice Exercises
      </a>

      <a class="practice-button" href="index.html">
        Home
      </a>
    `;

    var mainContent = document.querySelector(".main-content");

    if (mainContent) {
      mainContent.insertBefore(nav, mainContent.firstChild);
    }
  }


  // =========================================================
  // Previous / Next navigation
  // =========================================================

function injectPageNav() {

  var filename = window.location.pathname.split("/").pop();
  var match = filename.match(/^(\d+\.\d+)(-practice)?\.html$/);

  if (!match) return;

  var section = match[1];
  var isPractice = Boolean(match[2]);
  var currentIndex = sections.indexOf(section);

  if (currentIndex === -1) return;

  var previousSection =
    currentIndex > 0
      ? sections[currentIndex - 1]
      : null;

  var nextSection =
    currentIndex < sections.length - 1
      ? sections[currentIndex + 1]
      : null;

  var mainContent = document.querySelector(".main-content");

  if (!mainContent) return;


  // =========================================================
  // Practice pages
  // Previous / Next only
  // =========================================================

  if (isPractice) {

    var nav = document.createElement("nav");
    nav.className = "page-nav";
    nav.setAttribute("aria-label", "Practice section navigation");

    var previousLink = document.createElement("div");
    previousLink.className = "page-nav-prev";

    if (previousSection) {
      previousLink.innerHTML = `
        <a href="${previousSection}-practice.html">
          ← Previous: ${previousSection}
        </a>
      `;
    }

    var nextLink = document.createElement("div");
    nextLink.className = "page-nav-next";

    if (nextSection) {
      nextLink.innerHTML = `
        <a href="${nextSection}-practice.html">
          Next: ${nextSection} →
        </a>
      `;
    }

    nav.appendChild(previousLink);
    nav.appendChild(nextLink);

    mainContent.appendChild(nav);

    return;
  }


  // =========================================================
  // Regular section pages
  // Previous/Home | Practice | Next/Glossary
  // =========================================================

  // Remove the existing standalone Practice button from
  // the rendered page. It stays in the HTML as a fallback.
  var existingPracticeNav =
    mainContent.querySelector(".practice-nav-container");

  if (existingPracticeNav) {
    existingPracticeNav.remove();
  }


  var nav = document.createElement("nav");
  nav.className = "page-nav page-nav-three";
  nav.setAttribute("aria-label", "Section navigation");


  // LEFT: Previous section or Home
  var previousLink = document.createElement("div");
  previousLink.className = "page-nav-prev";

  if (previousSection) {
    previousLink.innerHTML = `
      <a href="${previousSection}.html">
        ← Previous: ${previousSection}
      </a>
    `;
  } else {
    previousLink.innerHTML = `
      <a href="index.html">
        ← Home
      </a>
    `;
  }


  // CENTER: Practice
  var practiceLink = document.createElement("div");
  practiceLink.className = "page-nav-practice";

  practiceLink.innerHTML = `
    <a class="practice-button" href="${section}-practice.html">
      Open ${section} Practice
    </a>
  `;


  // RIGHT: Next section or Glossary
  var nextLink = document.createElement("div");
  nextLink.className = "page-nav-next";

  if (nextSection) {
    nextLink.innerHTML = `
      <a href="${nextSection}.html">
        Next: ${nextSection} →
      </a>
    `;
  } else {
    nextLink.innerHTML = `
      <a href="glossary.html">
        Glossary →
      </a>
    `;
  }


  nav.appendChild(previousLink);
  nav.appendChild(practiceLink);
  nav.appendChild(nextLink);

  mainContent.appendChild(nav);
}


  // =========================================================
  // Initialize
  // =========================================================

  function init() {
    injectPracticeNav();
    injectPageNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();