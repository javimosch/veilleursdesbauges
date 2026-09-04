function main(input) {
  var body = JSON.parse(input.body || "{}");
  var email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: 400, body: { ok: false, error: "email required" } };
  }
  var n = bkn.store.count("veilleurs/subscribers", { email: email });
  if (n > 0) {
    return { status: 200, body: { ok: true, message: "already subscribed" } };
  }
  bkn.store.put("veilleurs/subscribers", { email: email, type: body.type || "subscriber", source: body.source || "veilleursdesbauges.fr" });
  return { status: 200, body: { ok: true, message: "subscribed" } };
}

