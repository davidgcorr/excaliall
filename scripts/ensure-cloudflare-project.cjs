const ensureProject = async ({
  token,
  accountId,
  projectName = "vedav",
  fetchImpl = fetch,
}) => {
  if (!token || !accountId) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required",
    );
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId,
  )}/pages/projects`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const existing = await fetchImpl(
    `${endpoint}/${encodeURIComponent(projectName)}`,
    { headers },
  );
  const current = await existing.json();
  if (existing.ok && current.success) {
    return "existing";
  }
  const missing =
    existing.status === 404 ||
    current.errors?.some(({ message }) => /project.*not found/i.test(message));
  if (!missing) {
    throw new Error(
      `Cannot inspect Cloudflare Pages project: ${
        current.errors?.map(({ message }) => message).join("; ") ||
        existing.status
      }`,
    );
  }
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: projectName, production_branch: "master" }),
  });
  const created = await response.json();
  if (!response.ok || !created.success) {
    throw new Error(
      `Cannot create Cloudflare Pages project: ${
        created.errors?.map(({ message }) => message).join("; ") ||
        response.status
      }`,
    );
  }
  return "created";
};

module.exports = { ensureProject };

if (require.main === module) {
  ensureProject({
    token: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  })
    .then((status) =>
      process.stdout.write(`VeDav Cloudflare Pages project: ${status}\n`),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
