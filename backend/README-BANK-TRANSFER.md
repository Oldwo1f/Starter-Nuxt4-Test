# Paiement par virement (N8N → Backend)

Ce document décrit l’intégration **N8N** pour confirmer automatiquement un paiement par virement, à partir d’un **ID de référence** généré côté utilisateur.

## 1) Principe

- L’utilisateur va sur la page account `Paiement (virement)` et génère une **référence** (ex: `NH-42-TO-8F3KQ2`).
- L’utilisateur fait un virement (5 000 ou 20 000 XPF) avec cette référence dans le **libellé**.
- N8N lit les emails de la banque, extrait la référence et appelle le webhook backend.
- Le backend confirme le paiement, met à jour l’état et attribue les droits pour **1 an** (`member` ou `premium`).

## 2) Variables d’environnement (backend)

- `BANK_TRANSFER_WEBHOOK_SECRET`: secret partagé pour sécuriser le webhook (recommandé: 32+ chars).

Le webhook exige ce header:

- `X-Webhook-Secret: <BANK_TRANSFER_WEBHOOK_SECRET>`

## 3) Endpoints

### (Utilisateur) Générer une référence

`POST /billing/bank-transfer/intent` (JWT requis)

Body:

```json
{ "pack": "teOhi" }
```

Packs:
- `teOhi` → 5 000 XPF/an → rôle `member`
- `umete` → 20 000 XPF/an → rôle `premium`

### (Utilisateur) Lire le statut

`GET /billing/bank-transfer/me` (JWT requis)

Retourne la dernière intention (pending/paid) et `paidAccessExpiresAt`.

### (N8N) Confirmer le paiement

`POST /billing/bank-transfer/webhook` (pas de JWT, **secret requis**)

Headers:
- `X-Webhook-Secret: ...`

Body minimal:

```json
{
  "referenceId": "NH-42-TO-8F3KQ2",
  "amountXpf": 5000
}
```

Body complet (optionnel):

```json
{
  "referenceId": "NH-42-TO-8F3KQ2",
  "amountXpf": 5000,
  "bankTransactionId": "BANKTX-2026-02-27-000123",
  "payerName": "DOE John",
  "paidAt": "2026-02-27T12:34:56.000Z"
}
```

## 4) Codes d’erreur (guideline N8N)

- `401`: secret absent/incorrect.
- `404`: référence inconnue.
- `400`: montant incorrect (ne correspond pas au pack attendu) ou date invalide.
- `201/200`: OK (idempotent si déjà payé).

## 5) Exemple curl

```bash
curl -X POST "$API_BASE_URL/billing/bank-transfer/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $BANK_TRANSFER_WEBHOOK_SECRET" \
  -d '{"referenceId":"NH-42-TO-8F3KQ2","amountXpf":5000}'
```

