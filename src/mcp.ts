#!/usr/bin/env node
/**
 * `minerador-mcp`: what an MCP client starts.
 *
 * On Windows npm launches a binary through a .cmd shim that runs
 * `node dist/mcp.js`, so the name the shim was called by never reaches Node.
 * Setting it here keeps the server/CLI choice right on every system.
 */
process.argv[1] = (process.argv[1] ?? "").replace(/[^/\\]*$/, "minerador-mcp");
void import("./index.js");
