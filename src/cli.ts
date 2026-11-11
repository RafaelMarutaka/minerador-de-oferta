#!/usr/bin/env node
/**
 * `minerador-cli`: the commands, for a terminal, a script or a scheduled task.
 *
 * Same reason as mcp.ts: the Windows .cmd shim hides the binary name, so it is
 * set here before the app reads it.
 */
process.argv[1] = (process.argv[1] ?? "").replace(/[^/\\]*$/, "minerador-cli");
void import("./index.js");
