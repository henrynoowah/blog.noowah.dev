import type { APIRoute } from "astro";

export const prerender = false;

// ponytail: ports sveltia-cms-auth's GitHub-only flow into a Vercel function
// instead of standing up a separate Cloudflare Worker. Add GitLab/other
// providers here only if a second git backend is actually needed.
export const GET: APIRoute = ({ url, cookies }) => {
  const provider = url.searchParams.get("provider");

  if (provider !== "github") {
    return new Response("Unsupported Git backend", { status: 400 });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;

  if (!clientId) {
    return new Response("OAuth client is not configured", { status: 500 });
  }

  const csrfToken = crypto.randomUUID().replace(/-/g, "");

  cookies.set("csrf-token", csrfToken, {
    httpOnly: true,
    path: "/",
    maxAge: 600,
    sameSite: "lax",
    secure: true,
  });

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", "repo,user");
  authorizeUrl.searchParams.set("state", csrfToken);

  return new Response(null, {
    status: 302,
    headers: { Location: authorizeUrl.toString() },
  });
};
