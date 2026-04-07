# API Endpoints Documentation (from server.py)

This document summarizes the HTTP API endpoints implemented in the `server.py` file.

## Base URL

`http://106.53.30.150:9097`

## Endpoints

---

### `POST /api/dial`

**Description:** Initiates a new call record in the database and sends an `incomingCall` WebSocket message to the target user if they are online.

**Request Body (JSON):**

```json
{
  "dialerUserId": "string",  // ID of the user initiating the call (required)
  "targetUserId": "string",  // ID of the user who will receive the call (required)
  "number": "string",        // The phone number being dialed (required)
  "location": "string",      // Optional: Location information for the number
  "callType": "string"       // Optional: Type of call, e.g., 'normal', 'redial' (defaults to 'normal')
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "Success",  // Description of the result
  "data": {
    "callId": "string" // The ID of the newly created call record
  }
}
```

---

### `POST /api/hangup`

**Description:** Handles call hangup or reject actions. Updates the call status in the database and notifies the other participant via WebSocket.

**Request Body (JSON):**

```json
{
  "callId": "string",  // The ID of the call to hangup/reject (required)
  "action": "string"   // The action performed: 'hangup', 'reject', 'guaduan', 'weijie' (required)
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "status": "string" // The final status of the call after the action
}
```

---

### `POST /api/mark-number`

**Description:** Marks a phone number with a specific type (e.g., 'normal', 'transfer', 'internal') or updates an existing mark.

**Request Body (JSON):**

```json
{
  "number": "string",    // The phone number to mark (required)
  "markType": "string",  // The type of mark ('normal', 'transfer', 'internal', etc.) (required)
  "userId": "string"     // The ID of the user performing the marking (required)
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string"    // Description of the result
}
```

---

### `POST /api/delete-call-record`

**Description:** Deletes one or more call records from the database.

**Request Body (JSON):**

```json
{
  "callId": "string[]" // A list of call IDs to delete (required). Can also be a single string ID.
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string"    // Description of the result
}
```

---

### `POST /api/send-message`

**Description:** Sends a new SMS message record and updates conversation entries.

**Request Body (JSON):**

```json
{
  "senderId": "string",       // The ID of the sender (required)
  "receiverPhone": "string",  // The phone number of the receiver (required)
  "content": "string",      // The content of the message (required)
  "ismy": "boolean"         // Whether the message is from the current user (true/false, or 1/0) (required)
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "messageId": "integer" // The ID of the newly created message record
  }
}
```

---

### `POST /api/delete-message`

**Description:** Deletes a single message from the database.

**Request Body (JSON):

```json
{
  "messageId": "integer",  // The ID of the message to delete (required)
  "userId": "string"       // The ID of the user attempting to delete (for verification) (required)
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "deleted": "boolean" // True if deletion was successful
  }
}
```

---

### `POST /api/delete-conversation`

**Description:** Deletes a single conversation and its associated messages for a specific user.

**Request Body (JSON):**

```json
{
  "userId": "string",  // The ID of the user whose conversation is being deleted (required)
  "phone": "string"    // The phone number associated with the conversation (required)
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "deleted": "boolean",           // True if deletion was successful
    "conversationDeleted": "boolean" // True if the conversation record was deleted
  }
}
```

---

### `POST /api/delete-conversations`

**Description:** Deletes multiple conversations and their associated messages for a specific user.

**Request Body (JSON):**

```json
{
  "userId": "string",   // The ID of the user whose conversations are being deleted (required)
  "phones": "string[]" // A list of phone numbers associated with the conversations (required)
}
```

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "deleted": "boolean",   // True if the operation completed
    "deletedCount": "integer", // The number of conversations deleted
    "totalCount": "integer"  // The total number of phones requested to delete
  }
}
```

---

### `GET /api/call-records`

**Description:** Fetches call records for a user, with optional filtering and pagination.

**Query Parameters:**

- `userId`: string (required) - The ID of the user whose records to fetch.
- `page`: integer (optional, default 1) - The page number for pagination.
- `pageSize`: integer (optional, default 20) - The number of records per page.
- `number`: string (optional) - Filter records by a specific phone number.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "list": [          // Array of call record objects
      {
        "call_id": "string",
        "dialer_user_id": "string",
        "backend_user_id": "string",
        "dialed_number": "string",
        "start_time": "integer", // Unix timestamp
        "end_time": "integer" | null, // Unix timestamp
        "duration": "integer" | null, // Duration in seconds
        "status": "string",    // e.g., 'ringing', 'connected', 'completed', 'no_answer', 'guaduan', 'weijie', etc.
        "location": "string" | null,
        "call_type": "string", // e.g., 'normal', 'redial'
        "created_at": "integer", // Unix timestamp
        "updated_at": "integer", // Unix timestamp
        "mark_type": "string" | null, // e.g., 'normal', 'transfer', 'internal'
        "display_name": "string", // Contact name or dialed_number
        "contact_name": "string" | null // Contact name if found
      }
      // ... more call record objects
    ],
    "total": "integer", // Total number of records matching criteria
    "page": "integer",  // Current page number
    "pageSize": "integer" // Records per page
  }
}
```

---

### `GET /api/call-status`

**Description:** Gets the current status of a specific call.

**Query Parameters:**

- `callId`: string (required) - The ID of the call to check.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "status": "string" // The status of the call (e.g., 'ringing', 'connected', 'completed', 'ended', 'unknown')
  }
}
```

---

### `GET /api/marked-numbers`

**Description:** Fetches a list of marked phone numbers with optional search and pagination.

**Query Parameters:**

- `query`: string (optional) - Search query to filter by phone number.
- `page`: integer (optional, default 1) - The page number for pagination.
- `pageSize`: integer (optional, default 20) - The number of records per page.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "list": [          // Array of marked number objects
      {
        "id": "integer",
        "dialed_number": "string",
        "mark_type": "string",
        "marked_by_user_id": "string" | null,
        "created_at": "integer",
        "updated_at": "integer"
      }
      // ... more marked number objects
    ],
    "total": "integer", // Total number of marked numbers matching criteria
    "page": "integer",  // Current page number
    "pageSize": "integer" // Records per page
  }
}
```

---

### `GET /api/ringtone-status`

**Description:** Gets the current global ringtone playback status.

**Query Parameters:** None

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "isPlaying": "boolean",    // True if ringtone is currently playing
    "lastUpdateTime": "integer" // Unix timestamp of the last status update
  }
}
```

---

### `GET /api/check-incoming-calls`

**Description:** Checks for the most recent incoming call with a 'ringing' status for a specific user.

**Query Parameters:**

- `userId`: string (required) - The ID of the user to check for incoming calls.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {          // Null if no incoming call, otherwise includes call details
    "callId": "string",
    "number": "string",
    "dialerUserId": "string",
    "location": "string" | null,
    "mark_type": "string" | null,
    "status": "string" // Will be 'ringing' if data is not null
  } | null
}
```

---

### `GET /api/phone-location`

**Description:** Retrieves the location information (province, city, company) for a given phone number using an external API.

**Query Parameters:**

- `phone`: string (required) - The phone number to look up.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {          // Null if location lookup fails
    "province": "string",
    "city": "string",
    "company": "string"
  } | null
}
```

---

### `GET /api/conversations`

**Description:** Fetches the list of conversations for a specific user, including the last message and unread count.

**Query Parameters:**

- `userId`: string (required) - The ID of the user whose conversations to fetch.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": [          // Array of conversation objects
    {
      "id": "integer",
      "user_id": "string",
      "phone": "string",
      "last_message": "string",
      "last_message_time": "integer", // Unix timestamp
      "unread_count": "integer",
      "created_at": "integer",
      "updated_at": "integer",
      "ismy": "boolean", // or 0/1
      "display_name": "string" // Contact name or phone number
    }
    // ... more conversation objects
  ]
}
```

---

### `GET /api/messages`

**Description:** Fetches the chat messages between a user and a specific phone number, with pagination.

**Query Parameters:**

- `userId`: string (required) - The ID of the user.
- `phone`: string (required) - The phone number of the other participant.
- `page`: integer (optional, default 1) - The page number for pagination.
- `pageSize`: integer (optional, default 20) - The number of messages per page.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string",   // Description of the result
  "data": {
    "list": [          // Array of message objects
      {
        "id": "integer",
        "sender_id": "string",
        "receiver_phone": "string",
        "content": "string",
        "status": "string", // e.g., 'sent', 'read'
        "ismy": "boolean", // or 0/1
        "created_at": "integer",
        "updated_at": "integer"
      }
      // ... more message objects
    ],
    "total": "integer", // Total number of messages in the conversation
    "page": "integer",  // Current page number
    "pageSize": "integer" // Messages per page
  }
}
```

---

### `DELETE /api/call-records`

**Description:** Deletes a single call record from the database using a query parameter.

**Query Parameters:**

- `callId`: string (required) - The ID of the call record to delete.

**Response (JSON):**

```json
{
  "code": 0,         // 0 for success, 1 for failure
  "msg": "string"    // Description of the result
}
```

---

### `OPTIONS /*`

**Description:** Handles CORS preflight requests for all paths.

**Query Parameters:** None

**Response:** Standard HTTP OK status with CORS headers.

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
...
``` 