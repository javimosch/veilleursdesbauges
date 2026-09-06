# bkn scripts backup — veilleursdesbauges.fr

These are the bkn scripts running on dk1 (BKN_HOME=/opt/bkn/home).
Backed up here for rollback and reproducibility.

## Scripts

| File | bkn script name | Description |
|------|----------------|-------------|
| `newsletter-subscribe.js` | `newsletter-subscribe` | Newsletter signup, stores to `veilleurs/subscribers` |
| `signalement-create.js` | `signalement-create` | Citizen report form, stores to `veilleurs/signalements` (with `attachments: []`) |
| `signalement-attachment.js` | `signalement-attachment` | File upload for signalements (max 5 advisory, JPEG/PNG/PDF/DOCX, magic bytes check). Appends with `$push` and names files with `bkn.id()`, so parallel uploads cannot overwrite each other — see *Concurrent uploads* |
| `signalements-digest.js` | `signalements-digest` | Hourly cron, publishes signalements to hart (with attachment thumbnails) |

## Collections

- `veilleurs/subscribers` — normalize: `email: trim_lower`
- `veilleurs/signalements` — normalize: `declarant.email: trim_lower`

## Hooks

| Name | Script | CORS origins | Rate limit | Max bytes |
|------|--------|-------------|------------|-----------|
| `newsletter-subscribe` | `newsletter-subscribe` | veilleursdesbauges.fr, www | 5/min | 1 MiB |
| `signalement-create` | `signalement-create` | veilleursdesbauges.fr, www | 3/min | 512 KB |
| `signalement-attachment` | `signalement-attachment` | veilleursdesbauges.fr, www | 10/min | 10 MB |

## Cron

| Name | Schedule | Script |
|------|----------|--------|
| `signalements-digest` | `@hourly` | `signalements-digest` |

## Files namespaces

| Namespace | Public | Allow types | Description |
|-----------|--------|-------------|-------------|
| `veilleurs-attachments` | yes | image/jpeg, image/png, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document | Signalement attachments (photos + documents) |

## Concurrent uploads

The browser sends each selected file as its own request, in parallel. Until
2026-09-06 this script read the whole signalement, appended to the array and
wrote the record back — so **five files arrived as one attachment**, measured,
not theorised. Two separate bugs produced that:

1. **Lost update.** Every concurrent request read the same array, appended to
   its own copy and wrote the whole record back. Last writer won.
2. **Colliding filenames.** The name was
   `<id>-<attachments.length>-<hmac(bkn.now() + length)>`, and `bkn.now()` has
   *second* resolution — so uploads arriving in the same second, all seeing
   length 0, computed the **same** name, and each `files.put` repointed that
   name at its own blob.

Both are fixed, and neither fix can be undone by accident:

- the array is appended with `bkn.store.patch(..., {attachments: {"$push": …}})`,
  which the store computes under compare-and-set, so concurrent pushes
  accumulate;
- the filename is `<id>-<bkn.id()>.<ext>` — a ULID, unique by construction,
  derived from nothing this request read.

Requires bkn **v0.2.0 or later** (`$push` landed there). Verified against
v0.3.0: five parallel uploads produce five attachments with five distinct
names, each resolving to its own blob.

**The max-5 bound is advisory under concurrency.** It is a cheap rejection for
a caller already at the limit, but five simultaneous uploads all read the same
length, and the store has no "push if shorter than n". A sixth attachment
costs a slightly long row; losing a citizen's evidence does not, which is why
the guarantee is on the append rather than on the bound.

## Restore

```bash
ssh dk1 'export BKN_HOME=/opt/bkn/home BKN_DATA=/opt/bkn/home/bkn.db \
  BKN_FILES_DIR=/opt/bkn/home/files BKN_ADMIN_TOKEN=<token> \
  BKN_ENCRYPTION_KEY=<key> BKN_AUTH_SECRET=<secret>'

# Recreate scripts from these files
bkn script create newsletter-subscribe -file bkn-scripts/newsletter-subscribe.js \
  -description "Newsletter signup for veilleursdesbauges.fr" -timeout 3000
bkn script create signalement-create -file bkn-scripts/signalement-create.js \
  -description "Citizen report form for veilleursdesbauges.fr" -timeout 5000
bkn script create signalement-attachment -file bkn-scripts/signalement-attachment.js \
  -description "Attachment upload for signalements (max 5, images+PDF+DOCX)" -timeout 15000
bkn script create signalements-digest -file bkn-scripts/signalements-digest.js \
  -description "Collect signalements and publish to hart" -timeout 15000 \
  -allow-net hart.intrane.fr

# Recreate files namespace
bkn files ns create veilleurs-attachments \
  --allow-type image/jpeg --allow-type image/png \
  --allow-type application/pdf \
  --allow-type "application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --public

# Recreate hooks
bkn hooks create newsletter-subscribe -script newsletter-subscribe \
  -allow-origin "https://veilleursdesbauges.fr" \
  -allow-origin "https://www.veilleursdesbauges.fr" \
  -rate-limit 5 -max-bytes 1048576
bkn hooks create signalement-create -script signalement-create \
  -allow-origin "https://veilleursdesbauges.fr" \
  -allow-origin "https://www.veilleursdesbauges.fr" \
  -rate-limit 3 -max-bytes 524288
bkn hooks create signalement-attachment -script signalement-attachment \
  -allow-origin "https://veilleursdesbauges.fr" \
  -allow-origin "https://www.veilleursdesbauges.fr" \
  -rate-limit 10 -max-bytes 5242880

# Recreate cron
bkn cron create signalements-digest -schedule "@hourly" -script signalements-digest
```
