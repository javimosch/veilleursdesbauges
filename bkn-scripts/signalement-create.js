function main(input) {
  var body = JSON.parse(input.body || "{}");
  if (!body.declarant || !body.declarant.email || !body.declarant.name) {
    return { status: 400, body: { ok: false, error: "declarant info required (name + email)" } };
  }
  if (!body.description || body.description.trim().length < 10) {
    return { status: 400, body: { ok: false, error: "description required (min 10 chars)" } };
  }
  if (!body.location || !body.location.commune) {
    return { status: 400, body: { ok: false, error: "location commune required" } };
  }
  if (!body.engagement || !body.engagement.sincerite || !body.engagement.analyse || !body.engagement.recontact) {
    return { status: 400, body: { ok: false, error: "all engagement checkboxes must be accepted" } };
  }
  var record = {
    declarant: body.declarant,
    nature: body.nature || [],
    location: body.location,
    description: body.description,
    impacts: body.impacts || [],
    sources: body.sources || [],
    info_source: body.info_source || [],
    engagement: body.engagement,
    source: body.source || "veilleursdesbauges.fr",
    status: "new",
    created_at: bkn.now(),
    attachments: []
  };
  var saved = bkn.store.put("veilleurs/signalements", record);
  return { status: 200, body: { ok: true, id: saved.id, message: "signalement received" } };
}

