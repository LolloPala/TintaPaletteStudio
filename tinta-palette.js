(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  let colors = [
      "#6558F5",
      "#8C82F8",
      "#B6B0FB",
      "#DCD9FE",
      "#F5F4FF",
    ],
    locks = [false, false, false, false, false],
    dragIndex = null;
  const validHex = (v) => /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
  function norm(v) {
    v = v.trim().replace(/^#/, "");
    if (v.length === 3) v = [...v].map((x) => x + x).join("");
    return "#" + v.toUpperCase();
  }
  function rgb(c) {
    c = norm(c).slice(1);
    return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  }
  function hsl(c) {
    let [r, g, b] = rgb(c).map((x) => x / 255),
      max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      h = 0,
      s = 0,
      l = (max + min) / 2;
    if (max !== min) {
      let d = max - min;
      s = l > .5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - b) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return "#" +
      [r, g, b].map((v) =>
        Math.round((v + m) * 255).toString(16).padStart(2, "0")
      ).join("").toUpperCase();
  }
  function lum(c) {
    return rgb(c).map((v) => {
      v /= 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  }
  function ratio(a, b) {
    let x = lum(a), y = lum(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  }
  function display(c) {
    let f = $("#valueFormat").value;
    if (f === "rgb") return rgb(c).join(", ");
    if (f === "unit") {
      return rgb(c).map((v) => (v / 255).toFixed(3)).join(", ");
    }
    return c;
  }
  function toast(msg) {
    let el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(
      () => el.classList.remove("show"),
      2000,
    );
  }
  async function copy(text, msg = "Copiato negli appunti") {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      let t = document.createElement("textarea");
      t.value = text;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    toast(msg);
  }
  function render() {
    let p = $("#palette");
    p.innerHTML = "";
    colors.forEach((c, i) => {
      let el = document.createElement("div");
      el.className = "swatch";
      el.style.background = c;
      el.draggable = true;
      el.dataset.index = i;
      el.setAttribute("aria-label", `Colore ${i + 1} ${c}`);
      el.innerHTML =
        `<div class="swatch-actions"><button class="circle lock" title="${
          locks[i] ? "Sblocca" : "Blocca"
        } colore" aria-label="${locks[i] ? "Sblocca" : "Blocca"} colore">${
          locks[i] ? "🔒" : "♧"
        }</button><button class="circle edit" title="Modifica colore" aria-label="Modifica colore">✎</button></div><div class="swatch-bottom"><button class="value" title="Copia valore">${
          display(c)
        }<small>${
          $("#valueFormat").value === "hex"
            ? "HEX"
            : $("#valueFormat").value === "rgb"
            ? "RGB · 0–255"
            : "sRGB · 0–1"
        }</small></button><div class="editor"><label>Codice HEX</label><input class="edithex" value="${c}" maxlength="7"><label>Valore RGB (0–255)</label><input class="editrgb" value="${
          rgb(c).join(", ")
        }"><label>Colore</label><input class="editpicker" type="color" value="${c}"><button class="btn apply" style="width:100%">Applica</button></div></div>`;
      el.querySelector(".lock").onclick = () => {
        locks[i] = !locks[i];
        render();
      };
      el.querySelector(".value").onclick = () =>
        copy(
          $("#valueFormat").value === "hex"
            ? c
            : $("#valueFormat").value === "rgb"
            ? `rgb(${rgb(c).join(", ")})`
            : `srgb(${rgb(c).map((v) => (v / 255).toFixed(3)).join(" ")})`,
          display(c) + " copiato",
        );
      el.querySelector(".edit").onclick = () =>
        el.querySelector(".editor").classList.toggle("open");
      el.querySelector(".editpicker").oninput = (e) => {
        el.querySelector(".edithex").value = e.target.value
          .toUpperCase();
        el.querySelector(".editrgb").value = rgb(e.target.value)
          .join(", ");
      };
      el.querySelector(".edithex").oninput = (e) => {
        if (validHex(e.target.value)) {
          let v = norm(e.target.value);
          el.querySelector(".editpicker").value = v;
          el.querySelector(".editrgb").value = rgb(v).join(", ");
        }
      };
      el.querySelector(".editrgb").oninput = (e) => {
        let a = e.target.value.split(/[,\s]+/).filter(Boolean)
          .map(Number);
        if (
          a.length === 3 &&
          a.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)
        ) {
          let v = "#" +
            a.map((x) => x.toString(16).padStart(2, "0")).join("")
              .toUpperCase();
          el.querySelector(".editpicker").value = v;
          el.querySelector(".edithex").value = v;
        }
      };
      el.querySelector(".apply").onclick = () => {
        let hx = el.querySelector(".edithex").value;
        if (!validHex(hx)) {
          toast("Codice HEX non valido");
          return;
        }
        colors[i] = norm(hx);
        render();
        fillContrast();
        toast("Colore aggiornato");
      };
      el.addEventListener("dragstart", (e) => {
        dragIndex = i;
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(i));
        } catch (_) {}
      });
      el.addEventListener("dragend", () => {
        dragIndex = null;
        $$(".swatch").forEach((x) =>
          x.classList.remove("dragging", "drop-target")
        );
      });
      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        el.classList.add("drop-target");
      });
      el.addEventListener(
        "dragleave",
        () => el.classList.remove("drop-target"),
      );
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        let from = dragIndex;
        if (from === null) {
          from = Number(e.dataTransfer.getData("text/plain"));
        }
        if (
          Number.isInteger(from) && from >= 0 &&
          from < colors.length && from !== i
        ) {
          let [c1] = colors.splice(from, 1);
          colors.splice(i, 0, c1);
          let [l1] = locks.splice(from, 1);
          locks.splice(i, 0, l1);
          render();
          fillContrast();
        }
      });
      p.append(el);
    });
    $("#seed").value = colors[0];
    $("#seedHex").value = colors[0];
    fillContrast();
  }
  function generate() {
    let n = Number($("#count").value),
      mode = $("#mode").value,
      seed = validHex($("#seedHex").value)
        ? norm($("#seedHex").value)
        : colors[0],
      [h, s, l] = hsl(seed),
      old = colors.slice(),
      oldLocks = locks.slice();
    let next = [];
    for (let i = 0; i < n; i++) {
      if (oldLocks[i] && old[i]) {
        next.push(old[i]);
        continue;
      }
      if (mode === "analogous") {
        next.push(
          fromHsl(
            h + (i - (n - 1) / 2) * 24,
            Math.max(.25, s),
            Math.max(
              .18,
              Math.min(.88, l + (i - (n - 1) / 2) * .06),
            ),
          ),
        );
      } else if (mode === "complementary") {
        next.push(
          fromHsl(
            h + (i % 2) * 180 + Math.floor(i / 2) * 9,
            Math.max(.35, s),
            Math.max(.18, Math.min(.86, l + (i % 3 - 1) * .1)),
          ),
        );
      } else if (mode === "triadic") {
        next.push(
          fromHsl(
            h + (i % 3) * 120 + Math.floor(i / 3) * 7,
            Math.max(.3, s),
            Math.max(.2, Math.min(.85, l + (i % 2 ? .12 : -.1))),
          ),
        );
      } else if (mode === "mono") {
        next.push(
          fromHsl(
            h,
            Math.max(.15, s),
            .18 + i * (.65 / Math.max(1, n - 1)),
          ),
        );
      } else {next.push(
          "#" +
            Math.floor(Math.random() * 16777216).toString(16)
              .padStart(6, "0").toUpperCase(),
        );}
    }
    colors = next;
    locks = Array.from(
      { length: n },
      (_, i) => !!oldLocks[i] && !!old[i] && old[i] === next[i],
    );
    render();
  }
  function fillContrast() {
    let oldFg = $("#fg").value, oldBg = $("#bg").value;
    ["#fg", "#bg"].forEach((sel) => {
      let previous = sel === "#fg" ? oldFg : oldBg;
      $(sel).innerHTML = colors.map((c, i) =>
        `<option value="${c}">Colore ${i + 1} · ${c}</option>`
      ).join("");
      if (colors.includes(previous)) $(sel).value = previous;
    });
    if (!$("#fg").value) $("#fg").value = colors[0];
    if (!$("#bg").value) $("#bg").value = colors.at(-1);
    updateContrast();
  }
  function updateContrast() {
    if (!$("#fg").options.length) return;
    let fg = $("#fg").value || colors[0],
      bg = $("#bg").value || colors.at(-1),
      r = ratio(fg, bg);
    $("#preview").style.color = fg;
    $("#preview").style.background = bg;
    $("#ratio").textContent = r.toFixed(2) + ":1";
    let tests = [
      ["AA testo normale", r >= 4.5],
      ["AA testo grande", r >= 3],
      ["AAA testo normale", r >= 7],
      ["AAA testo grande", r >= 4.5],
    ];
    $("#results").innerHTML = tests.map(([t, ok]) =>
      `<span class="tag ${ok ? "good" : "bad"}">${ok ? "✓" : "×"} ${t}: ${
        ok ? "Pass" : "Non passa"
      }</span>`
    ).join("");
  }
  function cssText() {
    return "/* sRGB */\\n:root {\\n" +
      colors.map((c, i) => `  --color-${i + 1}: ${c};`).join(
        "\\n",
      ) + "\\n}\\n";
  }
  function scssText() {
    return colors.map((c, i) => `$color-${i + 1}: ${c};`).join(
      "\\n",
    ) + "\\n";
  }
  function jsonText() {
    return JSON.stringify(
      {
        colorSpace: "sRGB",
        colors: colors.map((hex, i) => ({
          name: `Color ${i + 1}`,
          hex,
          rgb: rgb(hex),
          srgb: rgb(hex).map((v) => +(v / 255).toFixed(6)),
        })),
      },
      null,
      2,
    );
  }
  function download(name, content, type) {
    let blob = new Blob([content], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(name + " scaricato");
  }
  function svgText() {
    let w = 1200, h = 220, sw = w / colors.length;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>Tinta sRGB palette</title>${
      colors.map((c, i) =>
        `<g><rect x="${i * sw}" y="0" width="${
          sw + 1
        }" height="150" fill="${c}"/><text x="${
          i * sw + sw / 2
        }" y="185" font-family="Arial,sans-serif" font-size="20" text-anchor="middle" fill="#222">${c}</text></g>`
      ).join("")
    }</svg>`;
  }
  function aseText() {
    let chunks = [];
    function u16(n) {
      return [(n >> 8) & 255, n & 255];
    }
    function u32(n) {
      return [
        (n >>> 24) & 255,
        (n >>> 16) & 255,
        (n >>> 8) & 255,
        n & 255,
      ];
    }
    function str16(s) {
      let arr = [...s].map((c) => c.charCodeAt(0));
      return [
        ...u16(arr.length + 1),
        ...arr.flatMap((x) => u16(x)),
        0,
        0,
      ];
    }
    function float32(n) {
      let b = new ArrayBuffer(4);
      new DataView(b).setFloat32(0, n, false);
      return [...new Uint8Array(b)];
    }
    for (let i = 0; i < colors.length; i++) {
      let name = `Color ${i + 1}`,
        vals = rgb(colors[i]).map((v) => v / 255),
        body = [
          ...str16(name),
          0,
          0,
          0,
          0,
          ...[...BufferlessASCII("RGB ")],
          ...vals.flatMap(float32),
          0,
          2,
        ];
      chunks.push([...u16(1), ...u32(body.length), ...body]);
    }
    let all = chunks.flat();
    return new Uint8Array([
      ...BufferlessASCII("ASEF"),
      ...u16(1),
      ...u16(0),
      ...u32(chunks.length),
      ...all,
    ]);
  }
  function BufferlessASCII(s) {
    return [...s].map((c) => c.charCodeAt(0));
  }
  function savedList() {
    try {
      return JSON.parse(
        localStorage.getItem("tinta-palettes") || "[]",
      );
    } catch (_) {
      return [];
    }
  }
  function save() {
    let list = savedList();
    list.unshift({
      id: Date.now(),
      name: "Palette " + new Date().toLocaleDateString("it-IT"),
      colors: [...colors],
    });
    try {
      localStorage.setItem(
        "tinta-palettes",
        JSON.stringify(list.slice(0, 50)),
      );
      renderSaved();
      toast("Palette salvata");
    } catch (_) {
      toast(
        "Salvataggio non disponibile in questa modalità browser",
      );
    }
  }
  function renderSaved() {
    let list = savedList(), grid = $("#savedGrid");
    grid.innerHTML = "";
    $("#empty").style.display = list.length ? "none" : "block";
    list.forEach((item) => {
      let el = document.createElement("div");
      el.className = "saved";
      el.innerHTML = `<div class="saved-colors">${
        item.colors.map((c) => `<span style="background:${c}"></span>`).join("")
      }</div><div class="saved-info"><strong>${item.name}</strong><button class="open">Apri</button><button class="del" aria-label="Elimina palette">×</button></div>`;
      el.querySelector(".open").onclick = () => {
        colors = [...item.colors];
        locks = colors.map(() => false);
        $("#count").value = colors.length;
        render();
        toast("Palette caricata");
      };
      el.querySelector(".del").onclick = () => {
        localStorage.setItem(
          "tinta-palettes",
          JSON.stringify(
            savedList().filter((x) => x.id !== item.id),
          ),
        );
        renderSaved();
      };
      grid.append(el);
    });
  }
  $("#valueFormat").onchange = render;
  $("#generateBtn").onclick = generate;
  $("#shuffleBtn").onclick = () => {
    locks = locks.map(() => false);
    generate();
  };
  $("#count").onchange = () => {
    let n = Number($("#count").value);
    colors = colors.slice(0, n);
    locks = locks.slice(0, n);
    while (colors.length < n) {
      colors.push(
        "#" +
          Math.floor(Math.random() * 16777216).toString(16)
            .padStart(6, "0").toUpperCase(),
      );
      locks.push(false);
    }
    render();
  };
  $("#mode").onchange = generate;
  $("#seed").oninput = (e) =>
    $("#seedHex").value = e.target.value.toUpperCase();
  $("#seedHex").onchange = (e) => {
    if (validHex(e.target.value)) {
      e.target.value = norm(e.target.value);
      $("#seed").value = e.target.value;
    } else toast("Codice HEX non valido");
  };
  $("#saveBtn").onclick = save;
  $("#fg").onchange = updateContrast;
  $("#bg").onchange = updateContrast;
  $("#textSize").onchange = updateContrast;
  $("#copyValues").onclick = () =>
    copy(colors.map(display).join(", "), "Valori copiati");
  $("#copyCss").onclick = () => copy(cssText(), "CSS copiato");
  $("#copyScss").onclick = () => copy(scssText(), "SCSS copiato");
  $("#copyJson").onclick = () => copy(jsonText(), "JSON copiato");
  $("#shareBtn").onclick = () => {
    let url = location.href.split("#")[0] + "#" +
      colors.map((c) => c.slice(1).toLowerCase()).join("-");
    history.replaceState(null, "", url);
    copy(url, "Link copiato");
  };
  $("#downloadCss").onclick = () =>
    download("tinta-palette.css", cssText(), "text/css");
  $("#downloadSvg").onclick = () =>
    download("tinta-palette.svg", svgText(), "image/svg+xml");
  $("#downloadAse").onclick = () =>
    download(
      "tinta-palette.ase",
      aseText(),
      "application/octet-stream",
    );
  $("#exportBtn").onclick = () =>
    download(
      "tinta-palette.json",
      jsonText(),
      "application/json",
    );
  $$("[data-go]").forEach((b) =>
    b.onclick = () =>
      document.getElementById(b.dataset.go).scrollIntoView({
        behavior: "smooth",
      })
  );
  document.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" &&
      !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
        document.activeElement.tagName,
      ) && !e.ctrlKey && !e.metaKey
    ) {
      e.preventDefault();
      generate();
    }
  });
  function loadHash() {
    let h = location.hash.slice(1).split("-");
    if (
      h.length >= 3 && h.every((c) => /^[0-9a-f]{6}$/i.test(c))
    ) {
      colors = h.map((c) => "#" + c.toUpperCase());
      locks = colors.map(() => false);
      $("#count").value = colors.length;
    }
  }
  loadHash();
  $("#count").value = String(
    Math.max(3, Math.min(8, colors.length)),
  );
  render();
  renderSaved();
})();
