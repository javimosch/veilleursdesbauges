function main(input) {
  var records = bkn.store.list("veilleurs/subscribers", { limit: 500, order_by: "email" });
  var html = "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\">";
  html += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
  html += "<meta name=\"robots\" content=\"noindex,nofollow\">";
  html += "<title>Abonnes — Veilleurs des Bauges</title>";
  html += "<style>";
  html += "*{margin:0;padding:0;box-sizing:border-box}";
  html += "body{font-family:system-ui,sans-serif;background:#f3f9f4;color:#333;padding:20px}";
  html += ".container{max-width:800px;margin:0 auto}";
  html += "h1{color:#1f5a3a;margin-bottom:8px}";
  html += ".meta{color:#888;font-size:14px;margin-bottom:24px}";
  html += "table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}";
  html += "th{background:#1f5a3a;color:#fff;text-align:left;padding:12px 16px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px}";
  html += "td{padding:10px 16px;border-bottom:1px solid #e8f0e8;font-size:14px}";
  html += "tr:last-child td{border-bottom:none}";
  html += "tr:hover td{background:#f3f9f4}";
  html += ".email{font-weight:500;color:#1f5a3a}";
  html += ".type{font-size:12px;padding:2px 8px;border-radius:4px;background:#e6f4ea;color:#2f855a}";
  html += ".empty{text-align:center;padding:40px;color:#888}";
  html += ".footer{text-align:center;margin-top:24px;font-size:12px;color:#aaa}";
  html += ".stats{display:flex;gap:16px;margin-bottom:20px}";
  html += ".stat{background:#fff;border-radius:8px;padding:12px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}";
  html += ".stat-num{font-size:28px;font-weight:700;color:#1f5a3a}";
  html += ".stat-label{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px}";
  html += "</style></head><body><div class=\"container\">";
  html += "<h1>Abonnes a la newsletter</h1>";
  html += "<p class=\"meta\">Association Veilleurs des Bauges — liste des abonnes</p>";

  // Stats
  var total = records.length;
  var subscribers = 0;
  var veilleurs = 0;
  for (var i = 0; i < records.length; i++) {
    var t = records[i].type || "subscriber";
    if (t === "veilleur") veilleurs++;
    else subscribers++;
  }
  html += "<div class=\"stats\">";
  html += "<div class=\"stat\"><div class=\"stat-num\">" + total + "</div><div class=\"stat-label\">Total</div></div>";
  html += "<div class=\"stat\"><div class=\"stat-num\">" + subscribers + "</div><div class=\"stat-label\">Abonnes</div></div>";
  html += "<div class=\"stat\"><div class=\"stat-num\">" + veilleurs + "</div><div class=\"stat-label\">Veilleurs</div></div>";
  html += "</div>";

  if (records.length === 0) {
    html += "<div class=\"empty\">Aucun abonne pour le moment.</div>";
  } else {
    html += "<table><thead><tr><th>Email</th><th>Type</th><th>Source</th><th>Inscription</th></tr></thead><tbody>";
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var email = r.email || "";
      var type = r.type || "subscriber";
      var source = r.source || "veilleursdesbauges.fr";
      var date = r.created_at || "—";
      html += "<tr>";
      html += "<td class=\"email\">" + email + "</td>";
      html += "<td><span class=\"type\">" + type + "</span></td>";
      html += "<td>" + source + "</td>";
      html += "<td>" + date + "</td>";
      html += "</tr>";
    }
    html += "</tbody></table>";
  }

  html += "<div class=\"footer\">Genere automatiquement · " + bkn.now() + "</div>";
  html += "</div></body></html>";

  var resp = bkn.http.fetch("https://hart.intrane.fr/v1/publish?owner=vdb&artifact=subscribers&title=Abonnes%20VDB&format=html&visibility=private&read_key=EcoSentinel2026%40", {
    method: "POST",
    headers: { "Content-Type": "text/html" },
    body: html
  });

  if (resp.status !== 200) {
    return { status: 500, body: { ok: false, error: "hart publish failed", status: resp.status, body: resp.body } };
  }

  var result = JSON.parse(resp.body);
  return { status: 200, body: { ok: true, published: true, url: result.url, subscribers: records.length } };
}
