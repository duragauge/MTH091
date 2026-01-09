(function () {
  window.addEventListener("message", function (e) {
    if (typeof e.data !== "string" || !e.data.includes("lti.frameResize")) return;
    try {
      var payload = JSON.parse(e.data);
      if (!payload || !payload.frame_id) return;
      var id = String(payload.frame_id);
      var ifr  = document.getElementById(id);
      var wrap = document.getElementById(id + "wrap");
      if (ifr && payload.height)     ifr.style.height  = payload.height + "px";
      if (wrap && payload.wrapheight) wrap.style.height = payload.wrapheight + "px";
    } catch (_) { /* ignore non-JSON */ }
  });
})();