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

  // The browser uploads each file as a separate request, in parallel, so every
  // concurrent upload reads the same array here. This check is therefore a
  // fast rejection for a caller who is already at the limit, not a guarantee:
  // five simultaneous uploads all see the same length. The store has no
  // "push if shorter than n", and the cost of a sixth attachment is a row that
  // is slightly too long, so the bound stays advisory rather than growing a
  // lock around it. What is NOT advisory is that no upload may be lost - see
  // below.
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

  // The name must not be derived from anything this request read.
  //
  // It used to be signalementId + attachments.length + hmac(now + length), and
  // bkn.now() has second resolution - so two uploads that arrive in the same
  // second, both seeing length 0, computed the SAME filename, and the second
  // files.put silently repointed that name at its own blob. bkn.id() is a
  // ULID: unique by construction, with no read involved.
  var fileName = signalementId + "-" + bkn.id() + "." + ext;
  var f = bkn.files.put("veilleurs-attachments", fileName, bodyB64, {
    encoding: "base64",
    contentType: storedCt
  });

  // $push accumulates under compare-and-set inside the store, so concurrent
  // uploads add to each other instead of overwriting.
  //
  // The previous read-push-put lost every upload but one: each request read the
  // array, appended to its own copy, and wrote the whole record back, so the
  // last writer won. Five files selected in the browser arrived as one
  // attachment - and because the filename collided too, that one name pointed
  // at whichever blob was stored last.
  var updated = bkn.store.patch("veilleurs/signalements", signalementId, {
    attachments: {
      "$push": {
        name: fileName,
        original_name: originalName,
        content_type: storedCt,
        size: f.size,
        uploaded_at: bkn.now()
      }
    }
  });

  // patch returns null when the document is gone: deleted between the check
  // above and this write. The blob is already stored, so say so rather than
  // reporting a success that no record refers to.
  if (!updated) {
    return { status: 404, body: { ok: false, error: "signalement not found" } };
  }

  var count = (updated.attachments || []).length;
  return { status: 200, body: { ok: true, name: fileName, size: f.size, count: count } };
}

