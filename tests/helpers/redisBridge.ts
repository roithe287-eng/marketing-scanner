/** Test-only bridge. Runs real Redis Lua/TTL/atomic operations through the Upstash SDK.
 * Bound to loopback with an isolated loopback port; never deployed as an app route. */
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const exec = promisify(execFile);
export async function startRedisBridge() {
  const directory = await mkdtemp(join(tmpdir(), "ms-redis-test-"));
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, "127.0.0.1", r));
  const bound = probe.address();
  if (!bound || typeof bound === "string") throw new Error("No port");
  const redisPort = String(bound.port);
  await new Promise<void>((r) => probe.close(() => r()));
  const serverBin = process.env.REDIS_SERVER_BIN || "redis-server";
  const cliBin = process.env.REDIS_CLI_BIN || "redis-cli";
  const child = spawn(
    serverBin,
    [
      "--port",
      redisPort,
      "--bind",
      "127.0.0.1",
      "--save",
      "",
      "--appendonly",
      "no",
      "--loglevel",
      "warning",
    ],
    { stdio: "ignore" },
  );
  let processError: Error | undefined;
  child.on("error", (error) => {
    processError = error;
  });
  const command = async (args: unknown[]) => {
    const result = await exec(
      cliBin,
      [
        "-h",
        "127.0.0.1",
        "-p",
        redisPort,
        "--json",
        ...args.map((a) =>
          typeof a === "object" ? JSON.stringify(a) : String(a),
        ),
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    const parsed = JSON.parse(result.stdout);
    return String(args[0]).toUpperCase() === "HGETALL" &&
      parsed &&
      !Array.isArray(parsed)
      ? Object.entries(parsed).flat()
      : parsed;
  };
  let connected = false;
  for (let i = 0; i < 100; i++) {
    if (processError) throw processError;
    try {
      await command(["PING"]);
      connected = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (!connected) {
    child.kill();
    throw new Error("Redis test server did not start");
  }
  const encode = (value: unknown): unknown =>
    typeof value === "string"
      ? Buffer.from(value).toString("base64")
      : Array.isArray(value)
        ? value.map(encode)
        : value;
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.authorization !== "Bearer local-test-token") {
        res.writeHead(401);
        res.end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const input = JSON.parse(Buffer.concat(chunks).toString());
      const commands = Array.isArray(input[0]) ? input : [input];
      const results = [];
      for (const args of commands) {
        try {
          results.push({ result: encode(await command(args)) });
        } catch {
          results.push({ error: "Test Redis command failed" });
        }
      }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(Array.isArray(input[0]) ? results : results[0]));
    } catch {
      res.writeHead(500);
      res.end("{}");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No bridge port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    command,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      child.kill();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
