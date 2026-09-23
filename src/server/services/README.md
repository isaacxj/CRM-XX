# server/services

Domain logic, one module per entity. Every exported function takes a workspace-scoped `ctx` first and scopes its queries to `ctx.workspaceId`. Pages, route handlers, and server actions call these instead of querying the database directly. Added alongside each entity starting in Stage 5.
