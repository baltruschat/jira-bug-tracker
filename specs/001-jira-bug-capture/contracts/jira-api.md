# Jira Cloud REST API v3 Contracts

All endpoints use OAuth 2.0 Bearer token authentication.
Base URL: `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3`

---

## Authentication

### Get Accessible Resources

```
GET https://api.atlassian.com/oauth/token/accessible-resources
Authorization: Bearer {accessToken}
```

**Response 200**:
```json
[
  {
    "id": "cloud-id-here",
    "name": "My Jira Site",
    "url": "https://mysite.atlassian.net",
    "scopes": ["read:jira-work", "write:jira-work"],
    "avatarUrl": "https://..."
  }
]
```

### Token Exchange

```
POST https://auth.atlassian.com/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "{CLIENT_ID}",
  "client_secret": "{CLIENT_SECRET}",
  "code": "{AUTH_CODE}",
  "redirect_uri": "https://{ext-id}.chromiumapp.org/callback"
}
```

**Response 200**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "scope": "read:jira-work write:jira-work offline_access"
}
```

### Token Refresh

```
POST https://auth.atlassian.com/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "client_id": "{CLIENT_ID}",
  "client_secret": "{CLIENT_SECRET}",
  "refresh_token": "{REFRESH_TOKEN}"
}
```

**Response 200**: Same shape as token exchange. MUST store new
`refresh_token` (rotating tokens).

---

## Issue Operations

### Create Issue

```
POST /rest/api/3/issue
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request**:
```json
{
  "fields": {
    "project": { "key": "BUG" },
    "issuetype": { "id": "10001" },
    "summary": "Bug title here",
    "description": {
      "version": 1,
      "type": "doc",
      "content": []
    }
  }
}
```

**Response 201**:
```json
{
  "id": "10042",
  "key": "BUG-123",
  "self": "https://mysite.atlassian.net/rest/api/3/issue/10042"
}
```

**Errors**: 400 (invalid fields/ADF), 401 (unauthorized),
403 (no create permission)

### Upload Attachment

```
POST /rest/api/3/issue/{issueKey}/attachments
Authorization: Bearer {accessToken}
X-Atlassian-Token: no-check
Content-Type: multipart/form-data
```

Body: FormData with field name `file` containing the PNG blob.
Do NOT manually set Content-Type header when using FormData.

**Response 200**:
```json
[
  {
    "id": "10001",
    "filename": "screenshot.png",
    "mimeType": "image/png",
    "size": 245678,
    "content": "https://...",
    "thumbnail": "https://..."
  }
]
```

**Errors**: 403 (missing X-Atlassian-Token or no permission),
404 (issue not found), 413 (file too large)

---

## Read Operations

### List Projects

```
GET /rest/api/3/project/search?startAt=0&maxResults=50&query={search}
Authorization: Bearer {accessToken}
Accept: application/json
```

**Response 200**:
```json
{
  "values": [
    {
      "id": "10001",
      "key": "BUG",
      "name": "Bug Tracker",
      "projectTypeKey": "software",
      "avatarUrls": { "48x48": "...", "24x24": "...", "16x16": "...", "32x32": "..." }
    }
  ],
  "isLast": false,
  "total": 87,
  "startAt": 0,
  "maxResults": 50
}
```

Paginate using `isLast` (not `total`).

### List Issue Types for Project

```
GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes
Authorization: Bearer {accessToken}
Accept: application/json
```

**Response 200**:
```json
{
  "values": [
    { "id": "10001", "name": "Bug", "subtask": false },
    { "id": "10002", "name": "Task", "subtask": false },
    { "id": "10003", "name": "Sub-task", "subtask": true }
  ],
  "isLast": true
}
```

Filter out `subtask: true` in the UI.

### Get Current User

```
GET /rest/api/3/myself
Authorization: Bearer {accessToken}
Accept: application/json
```

**Response 200**:
```json
{
  "accountId": "5b10a2844c20165700ede21g",
  "displayName": "Jane Smith",
  "emailAddress": "jane@example.com",
  "active": true,
  "avatarUrls": { "48x48": "...", "24x24": "...", "16x16": "...", "32x32": "..." }
}
```
