function main(input) {
  var records = bkn.store.list("veilleurs/signalements", { limit: 100 });
  var html = "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
  html += "<meta name=\"robots\" content=\"noindex,nofollow\">";
  html += "<title>Signalements — Veilleurs des Bauges</title>";
  html += "<style>";
  html += "*{margin:0;padding:0;box-sizing:border-box}";
  html += "body{font-family:system-ui,sans-serif;background:#f3f9f4;color:#333;padding:20px}";
  html += ".container{max-width:900px;margin:0 auto}";
  html += "h1{color:#1f5a3a;margin-bottom:8px}";
  html += ".meta{color:#888;font-size:14px;margin-bottom:24px}";
  html += ".card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:20px;margin-bottom:16px}";
  html += ".card-header{display:flex;justify-content:space-between;align-items:start;margin-bottom:12px}";
  html += ".card-title{font-size:18px;font-weight:600;color:#1f5a3a}";
  html += ".card-status{font-size:12px;padding:3px 10px;border-radius:20px;background:#e6f4ea;color:#2f855a;text-transform:uppercase}";
  html += ".card-status.new{background:#fff3cd;color:#856404}";
  html += ".card-section{margin-bottom:10px}";
  html += ".label{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}";
  html += ".value{font-size:14px;color:#333}";
  html += ".tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}";
  html += ".tag{font-size:12px;padding:2px 8px;border-radius:4px;background:#e6f4ea;color:#2f855a}";
  html += ".empty{text-align:center;padding:40px;color:#888}";
  html += ".footer{text-align:center;margin-top:24px;font-size:12px;color:#aaa}";
  html += ".attachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}";
  html += ".attachments a{display:block}";
  html += ".attachments img{width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e0e0e0;cursor:pointer;transition:opacity 0.2s}";
  html += ".attachments img:hover{opacity:0.8}";
  html += "</style></head><body><div class=\"container\">";
  html += "<h1>Signalements citoyens</h1>";
  html += "<p class=\"meta\">Association Veilleurs des Bauges — " + records.length + " signalement(s)</p>";

  if (records.length === 0) {
    html += "<div class=\"empty\">Aucun signalement pour le moment.</div>";
  } else {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var d = r.declarant || {};
      var loc = r.location || {};
      var statusClass = r.status === "new" ? " new" : "";
      html += "<div class=\"card\">";
      html += "<div class=\"card-header\">";
      html += "<div class=\"card-title\">" + (d.name || "Anonyme") + " — " + (loc.commune || "Lieu non précisé") + "</div>";
      html += "<span class=\"card-status" + statusClass + "\">" + (r.status || "new") + "</span>";
      html += "</div>";

      html += "<div class=\"card-section\"><div class=\"label\">Description</div><div class=\"value\">" + (r.description || "") + "</div></div>";

      if (d.email) {
        html += "<div class=\"card-section\"><div class=\"label\">Contact</div><div class=\"value\">" + d.email;
        if (d.phone) html += " · " + d.phone;
        if (d.confidential === "true") html += " · <em>identité confidentielle</em>";
        html += "</div></div>";
      }

      if (loc.place || loc.cadastre) {
        html += "<div class=\"card-section\"><div class=\"label\">Localisation</div><div class=\"value\">";
        if (loc.place) html += loc.place;
        if (loc.cadastre) html += " · Cadastre: " + loc.cadastre;
        html += "</div></div>";
      }

      if (r.nature && r.nature.length > 0) {
        html += "<div class=\"card-section\"><div class=\"label\">Nature</div><div class=\"tags\">";
        for (var j = 0; j < r.nature.length; j++) {
          html += "<span class=\"tag\">" + r.nature[j] + "</span>";
        }
        html += "</div></div>";
      }

      if (r.impacts && r.impacts.length > 0) {
        html += "<div class=\"card-section\"><div class=\"label\">Impacts</div><div class=\"tags\">";
        for (var j = 0; j < r.impacts.length; j++) {
          html += "<span class=\"tag\">" + r.impacts[j] + "</span>";
        }
        html += "</div></div>";
      }

      if (r.sources && r.sources.length > 0) {
        html += "<div class=\"card-section\"><div class=\"label\">Sources</div><div class=\"tags\">";
        for (var j = 0; j < r.sources.length; j++) {
          html += "<span class=\"tag\">" + r.sources[j] + "</span>";
        }
        html += "</div></div>";
      }

      // Attachments — inline as data URIs, clickable to open raw on bkn
      var atts = r.attachments || [];
      if (atts.length > 0) {
        html += "<div class=\"card-section\"><div class=\"label\">Images (" + atts.length + ")</div><div class=\"attachments\">";
        for (var j = 0; j < atts.length; j++) {
          var fileData = bkn.files.get("veilleurs-attachments", atts[j].name, { encoding: "base64" });
          if (fileData) {
            var mime = atts[j].content_type || "image/jpeg";
            var rawUrl = "https://bkn.intrane.fr/v1/files/veilleurs-attachments/" + atts[j].name;
            html += "<a href=\"" + rawUrl + "\" target=\"_blank\" rel=\"noopener\">";
            html += "<img src=\"data:" + mime + ";base64," + fileData.content + "\" alt=\"image " + (j+1) + "\" title=\"Cliquez pour ouvrir en grand\">";
            html += "</a>";
          }
        }
        html += "</div></div>";
      }

      html += "<div class=\"card-section\"><div class=\"label\">Reçu le</div><div class=\"value\">" + (r.created_at || "") + "</div></div>";
      html += "</div>";
    }
  }

  html += "<div class=\"footer\">Généré automatiquement · " + bkn.now() + "</div>";
  html += "</div></body></html>";

  var resp = bkn.http.fetch("https://hart.intrane.fr/v1/publish?owner=vdb&artifact=signalements&title=Signalements%20VDB&format=html&visibility=unlisted", {
    method: "POST",
    headers: { "Content-Type": "text/html" },
    body: html
  });

  if (resp.status !== 200) {
    return { status: 500, body: { ok: false, error: "hart publish failed", status: resp.status, body: resp.body } };
  }

  var result = JSON.parse(resp.body);
  return { status: 200, body: { ok: true, published: true, url: result.url, signalements: records.length } };
}

