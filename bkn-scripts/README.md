# bkn scripts backup — veilleursdesbauges.fr

These are the bkn scripts running on dk1 (BKN_HOME=/opt/bkn/home).
Backed up here for rollback and reproducibility.

## Scripts

| File | bkn script name | Description |
|------|----------------|-------------|
| `newsletter-subscribe.js` | `newsletter-subscribe` | Newsletter signup, stores to `veilleurs/subscribers` |
| `signalement-create.js` | `signalement-create` | Citizen report form, stores to `veilleurs/signalements` (with `attachments: []`) |
| `signalement-attachment.js` | `signalement-attachment` | File upload for signalements (max 5, JPEG/PNG/PDF/DOCX, magic bytes check) |
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
