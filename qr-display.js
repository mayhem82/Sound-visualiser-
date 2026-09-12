// Shared "Show QR code" popup -- the missing other half of every "Copy as
// JSON"/"Copy a tag" feature this suite has built. Those all used to end
// with "paste it into any free QR generator"; now the app renders the
// code itself, via the real from-scratch encoder in qrcode-gen.js. Pure
// inline styles (no page-specific CSS needed) so this drops into any page
// unchanged.
(function (global) {
  "use strict";

  function showQrPopup(text, opts) {
    const options = opts || {};
    let overlay = document.getElementById("qrDisplayOverlay");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "qrDisplayOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", options.title || "QR code");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", background: "rgba(5,5,10,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: "99999", padding: "24px", gap: "16px", fontFamily: "system-ui, sans-serif",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "#fff", padding: "16px", borderRadius: "12px",
      maxWidth: "90vw", maxHeight: "70vh", overflow: "auto", textAlign: "center",
    });

    let errorMsg = "";
    try {
      const qr = global.QRCodeGen.encode(text, { ecLevel: options.ecLevel || "M" });
      card.innerHTML = global.QRCodeGen.toSvgString(qr, {
        moduleSize: options.moduleSize || 6,
        margin: options.margin === undefined ? 3 : options.margin,
        darkColor: "#000000",
        lightColor: "#ffffff",
      });
    } catch (e) {
      errorMsg = "Couldn't generate a QR code: " + e.message;
      const p = document.createElement("p");
      p.style.cssText = "color:#900;max-width:280px;margin:0;";
      p.textContent = errorMsg;
      card.appendChild(p);
    }

    if (options.caption) {
      const caption = document.createElement("p");
      caption.style.cssText = "color:#222;font-size:13px;margin:10px 0 0;max-width:320px;";
      caption.textContent = options.caption;
      card.appendChild(caption);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.className = "hud-btn";
    closeBtn.style.cssText = "cursor:pointer;";
    closeBtn.addEventListener("click", () => overlay.remove());

    overlay.appendChild(card);
    overlay.appendChild(closeBtn);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", onKey); }
    });
    document.body.appendChild(overlay);
    closeBtn.focus();
    return !errorMsg;
  }

  global.showQrPopup = showQrPopup;
})(window);
