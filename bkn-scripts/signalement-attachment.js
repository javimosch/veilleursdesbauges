function main(input) {
  var signalementId = input.query.id || "";
  if (!signalementId) {
    return { status: 400, body: { ok: false, error: "id query parameter required" } };
  }

  var contentType = input.headers["Content-Type"] || input.headers["content-type"] || "";
  if (contentType.indexOf("image/") !== 0 && contentType !== "application/pdf" && contentType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { status: 400, body: { ok: false, error: "only image/jpeg, image/png, application/pdf, or .docx accepted" } };
  }

  var bodyB64 = input.body_base64 || "";
  if (!bodyB64) {
    return { status: 400, body: { ok: false, error: "empty body" } };
  }

  // Magic bytes validation via base64 prefix
  var prefix = bodyB64.substring(0, 12);
  var isJpeg = prefix.indexOf("/9j/") === 0;
  var isPng = prefix.indexOf("iVBOR") === 0;
  var isPdf = prefix.indexOf("JVBERi") === 0;
  var isDocx = prefix.indexOf("UEsDB") === 0;
  if (!isJpeg && !isPng && !isPdf && !isDocx) {
    return { status: 400, body: { ok: false, error: "file does not appear to be a valid image, PDF, or DOCX" } };
  }

  // Cross-check content-type matches magic bytes
  if (contentType.indexOf("image/") === 0 && !isJpeg && !isPng) {
    return { status: 400, body: { ok: false, error: "content-type is image but file is not a valid image" } };
  }
  if (contentType === "application/pdf" && !isPdf) {
    return { status: 400, body: { ok: false, error: "content-type is PDF but file is not a valid PDF" } };
  }
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !isDocx) {
    return { status: 400, body: { ok: false, error: "content-type is DOCX but file is not a valid DOCX" } };
  }

  var existing = bkn.store.get("veilleurs/signalements", signalementId);
  if (!existing) {
    return { status: 404, body: { ok: false, error: "signalement not found" } };
  }

  var attachments = existing.attachments || [];
  if (attachments.length >= 5) {
    return { status: 400, body: { ok: false, error: "max 5 attachments allowed" } };
  }

  // Determine extension and stored content-type from magic bytes
  var ext, storedCt;
  if (isJpeg) { ext = "jpg"; storedCt = "image/jpeg"; }
  else if (isPng) { ext = "png"; storedCt = "image/png"; }
  else if (isPdf) { ext = "pdf"; storedCt = "application/pdf"; }
  else { ext = "docx"; storedCt = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; }

  // Preserve original filename (sanitized)
  var originalName = input.query.name || "";
  if (originalName) {
    // Strip path components, keep only the filename
    originalName = originalName.split("/").pop().split("\\").pop();
    // Remove dangerous chars, keep alnum/dot/dash/underscore/space
    originalName = originalName.replace(/[^a-zA-Z0-9.\-_ ]/g, "");
    // Limit length
    if (originalName.length > 200) originalName = originalName.substring(0, 200);
  }

  var rand = bkn.crypto.hmac("att", bkn.now() + "" + attachments.length).substring(0, 8);
  var fileName = signalementId + "-" + attachments.length + "-" + rand + "." + ext;
  var f = bkn.files.put("veilleurs-attachments", fileName, bodyB64, {
    encoding: "base64",
    contentType: storedCt
  });

  attachments.push({
    name: fileName,
    original_name: originalName,
    content_type: storedCt,
    size: f.size,
    uploaded_at: bkn.now()
  });
  existing.attachments = attachments;
  bkn.store.put("veilleurs/signalements", existing, signalementId);

  return { status: 200, body: { ok: true, name: fileName, size: f.size, count: attachments.length } };
}

