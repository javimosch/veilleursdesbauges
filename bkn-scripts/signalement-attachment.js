function main(input) {
  var signalementId = input.query.id || "";
  if (!signalementId) {
    return { status: 400, body: { ok: false, error: "id query parameter required" } };
  }

  var contentType = input.headers["Content-Type"] || input.headers["content-type"] || "";
  if (contentType.indexOf("image/") !== 0) {
    return { status: 400, body: { ok: false, error: "only image/* content-type accepted" } };
  }

  var bodyB64 = input.body_base64 || "";
  if (!bodyB64) {
    return { status: 400, body: { ok: false, error: "empty body" } };
  }

  var prefix = bodyB64.substring(0, 12);
  var isJpeg = prefix.indexOf("/9j/") === 0;
  var isPng = prefix.indexOf("iVBOR") === 0;
  if (!isJpeg && !isPng) {
    return { status: 400, body: { ok: false, error: "file does not appear to be a valid JPEG or PNG image" } };
  }

  var existing = bkn.store.get("veilleurs/signalements", signalementId);
  if (!existing) {
    return { status: 404, body: { ok: false, error: "signalement not found" } };
  }

  var attachments = existing.attachments || [];
  if (attachments.length >= 5) {
    return { status: 400, body: { ok: false, error: "max 5 attachments allowed" } };
  }

  var ext = isPng ? "png" : "jpg";
  var rand = bkn.crypto.hmac("att", bkn.now() + "" + attachments.length).substring(0, 8);
  var fileName = signalementId + "-" + attachments.length + "-" + rand + "." + ext;
  var f = bkn.files.put("veilleurs-attachments", fileName, bodyB64, {
    encoding: "base64",
    contentType: isPng ? "image/png" : "image/jpeg"
  });

  attachments.push({
    name: fileName,
    content_type: isPng ? "image/png" : "image/jpeg",
    size: f.size,
    uploaded_at: bkn.now()
  });
  existing.attachments = attachments;
  bkn.store.put("veilleurs/signalements", existing, signalementId);

  return { status: 200, body: { ok: true, name: fileName, size: f.size, count: attachments.length } };
}

