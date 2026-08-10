import type { APIRoute } from "astro";

export const prerender = false;

function outputHTML(state: "success" | "error", content: Record<string, unknown>) {
  const message = `authorization:github:${state}:${JSON.stringify(content)}`;
  const html = `<!doctype html><html><body><script>
(() => {
  window.addEventListener("message", ({ data, origin }) => {
    if (data === "authorizing:github") {
      window.opener?.postMessage(${JSON.stringify(message)}, origin);
    }
  });
  window.opener?.postMessage("authorizing:github", "*");
})();
</script></body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const csrfToken = cookies.get("csrf-token")?.value;

  cookies.delete("csrf-token", { path: "/" });

  if (!code || !state || !csrfToken || state !== csrfToken) {
    return outputHTML("error", {
      provider: "github",
      error: "Authentication failed — please try again.",
    });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return outputHTML("error", { provider: "github", error: "OAuth client is not configured." });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ code, client_id: clientId, client_secret: clientSecret }),
  });

  const { access_token: token, error } = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!token) {
    return outputHTML("error", {
      provider: "github",
      error: error ?? "Failed to obtain an access token.",
    });
  }

  return outputHTML("success", { provider: "github", token });
};
