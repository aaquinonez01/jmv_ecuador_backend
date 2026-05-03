# Quiz Socket v1

Namespace: `quiz`

Client -> Server events:
- `session.join` `{ sessionId, roomCode }`
- `session.leave` `{ sessionId }`
- `session.host.start` `{ sessionId }`
- `session.host.cancel` `{ sessionId }`
- `question.answer` `{ sessionId, questionId, optionId }`

Server -> Client events:
- `session.joined`
- `session.presence.updated`
- `session.started`
- `question.started`
- `question.closed`
- `session.finished`
- `session.error`
