const { test } = require("node:test");
const assert = require("node:assert/strict");

const { ensureProject } = require("./ensure-cloudflare-project.cjs");

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test("does not recreate an existing Pages project", async () => {
  let calls = 0;
  assert.equal(
    await ensureProject({
      token: "test",
      accountId: "account",
      fetchImpl: async () => {
        calls++;
        return response(200, { success: true });
      },
    }),
    "existing",
  );
  assert.equal(calls, 1);
});

test("creates only the named project when it is missing", async () => {
  const calls = [];
  const status = await ensureProject({
    token: "test",
    accountId: "account",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? response(404, { success: false })
        : response(200, { success: true });
    },
  });
  assert.equal(status, "created");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    name: "vedav",
    production_branch: "master",
  });
});

test("does not try to create a project when authentication fails", async () => {
  let calls = 0;
  await assert.rejects(
    ensureProject({
      token: "test",
      accountId: "account",
      fetchImpl: async () => {
        calls++;
        return response(403, {
          success: false,
          errors: [{ message: "Forbidden" }],
        });
      },
    }),
    /Cannot inspect/,
  );
  assert.equal(calls, 1);
});
