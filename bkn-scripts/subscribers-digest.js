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
  html += ".copy-bar{margin-top:20px}";
  html += ".copy-btn{background:#1f5a3a;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s}";
  html += ".copy-btn:hover{background:#164028}";
  html += ".copy-btn.copied{background:#2f855a}";
  html += ".skip-btn{background:none;border:none;cursor:pointer;font-size:18px;color:#aaa;padding:2px 6px;border-radius:4px;transition:all 0.15s;line-height:1}";
  html += ".skip-btn:hover{color:#c53030;background:#fef2f2}";
  html += "tr.skipped td{opacity:0.45}";
  html += "tr.skipped .email{text-decoration:line-through;color:#999}";
  html += ".skip-btn.active{color:#c53030}";
  html += "tr.skipped .skip-btn{color:#c53030}";
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

  // Collect emails for the copy button
  var emails = [];
  for (var i = 0; i < records.length; i++) {
    if (records[i].email) emails.push(records[i].email);
  }

  if (records.length === 0) {
    html += "<div class=\"empty\">Aucun abonne pour le moment.</div>";
  } else {
    html += "<table><thead><tr><th>Email</th><th>Type</th><th>Source</th><th>Inscription</th><th></th></tr></thead><tbody>";
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var email = r.email || "";
      var type = r.type || "subscriber";
      var source = r.source || "veilleursdesbauges.fr";
      var date = r.created_at || "—";
      html += "<tr data-email=\"" + email + "\">";
      html += "<td class=\"email\">" + email + "</td>";
      html += "<td><span class=\"type\">" + type + "</span></td>";
      html += "<td>" + source + "</td>";
      html += "<td>" + date + "</td>";
      html += "<td><button class=\"skip-btn\" data-email=\"" + email + "\" title=\"Ignorer cet email\">&#x229d;</button></td>";
      html += "</tr>";
    }
    html += "</tbody></table>";
  }

  // Copy button + skip logic (comma-separated, non-skipped emails)
  if (emails.length > 0) {
    html += "<div class=\"copy-bar\"><button class=\"copy-btn\" id=\"copyEmails\">Copier les emails (" + emails.length + ")</button></div>";
    html += "<script>";
    html += "var allEmails=" + JSON.stringify(emails) + ";";
    html += "var STORAGE_KEY='vdb_skipped_emails';";
    html += "function loadSkipped(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch(e){return[]}};";
    html += "function saveSkipped(s){localStorage.setItem(STORAGE_KEY,JSON.stringify(s))};";
    html += "function activeEmails(){var sk=loadSkipped();return allEmails.filter(function(e){return sk.indexOf(e)===-1})};";
    html += "function updateUI(){var sk=loadSkipped();document.querySelectorAll('tr[data-email]').forEach(function(tr){var e=tr.getAttribute('data-email');var btn=tr.querySelector('.skip-btn');if(sk.indexOf(e)>-1){tr.classList.add('skipped');btn.classList.add('active');btn.innerHTML='&#x2299;';btn.title='Reinclure cet email'}else{tr.classList.remove('skipped');btn.classList.remove('active');btn.innerHTML='&#x229d;';btn.title='Ignorer cet email'}});var n=activeEmails().length;var btn=document.getElementById('copyEmails');btn.textContent='Copier les emails ('+n+')'};";
    html += "document.querySelectorAll('.skip-btn').forEach(function(btn){btn.addEventListener('click',function(){var e=this.getAttribute('data-email');var sk=loadSkipped();var i=sk.indexOf(e);if(i>-1){sk.splice(i,1)}else{sk.push(e)}saveSkipped(sk);updateUI()})});";
    html += "document.getElementById('copyEmails').addEventListener('click',function(){";
    html += "var list=activeEmails();var text=list.join(', ');var btn=this;var total=allEmails.length;";
    html += "if(navigator.clipboard&&navigator.clipboard.writeText){";
    html += "navigator.clipboard.writeText(text).then(function(){btn.textContent='Copie ! ('+list.length+'/'+total+')';btn.classList.add('copied');setTimeout(function(){btn.textContent='Copier les emails ('+list.length+')';btn.classList.remove('copied')},2000)});";
    html += "}else{";
    html += "var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);";
    html += "btn.textContent='Copie ! ('+list.length+'/'+total+')';btn.classList.add('copied');setTimeout(function(){btn.textContent='Copier les emails ('+list.length+')';btn.classList.remove('copied')},2000);";
    html += "}});";
    html += "updateUI();";
    html += "</script>";
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
