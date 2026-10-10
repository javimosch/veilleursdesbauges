function main(input) {
  var body = JSON.parse(input.body || "{}");
  var email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: 400, body: { ok: false, error: "email required" } };
  }
  var prenom = (body.prenom || "").trim();
  var nom = (body.nom || "").trim();
  var existing = bkn.store.list("veilleurs/subscribers", { where: { email: email }, limit: 1 });
  if (existing.length > 0) {
    if (prenom || nom) {
      var doc = existing[0];
      if (prenom) doc.prenom = prenom;
      if (nom) doc.nom = nom;
      bkn.store.put("veilleurs/subscribers", doc, doc.id);
    }
    return { status: 200, body: { ok: true, message: "already subscribed" } };
  }
  var rec = { email: email, type: body.type || "subscriber", source: body.source || "veilleursdesbauges.fr" };
  if (prenom) rec.prenom = prenom;
  if (nom) rec.nom = nom;
  bkn.store.put("veilleurs/subscribers", rec);
  return { status: 200, body: { ok: true, message: "subscribed" } };
}
