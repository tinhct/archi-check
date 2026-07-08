# Interface & Systems Catalog

**Last Updated:** 2026-07-08

## 🌐 System Boundaries

| System / Provider | Interface Type (REST/gRPC/GraphQL/Event) | Direction (Inbound/Outbound) | Authentication Method | Criticality (High/Med/Low) |
|-------------------|------------------------------------------|------------------------------|-----------------------|----------------------------|
| **GitHub Webhook Listener** | REST (HTTP POST Event payload) | Inbound | HMAC SHA256 signature verification (`x-hub-signature-256` header) | High |
| **GitHub REST API (Octokit)** | REST (Octokit Client) | Outbound | Signed JWT -> exchange for installation-scoped OAuth App tokens | High |
| **Upstash Redis State Cache** | REST (HTTPS REST Client) | Outbound | Upstash DB Bearer REST token (`UPSTASH_REDIS_REST_TOKEN`) | High |
| **Gemini Developer API** | REST (HTTPS JSON) | Outbound | Model API Key string (`GEMINI_API_KEY`) | High |
| **GCP Vertex AI Endpoint** | REST (GCP SDK) | Outbound | Google Service Account Credentials JSON (`GOOGLE_CREDS_JSON`) | High |
