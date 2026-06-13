function env(name: string, fallback = ""): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export interface LtiConfig {
  readonly toolBaseUrl: string;
  readonly clientId: string;
  readonly deploymentId: string;
  readonly platformIssuer: string;
  readonly authUrl: string;
  readonly jwksUrl: string;
  readonly tokenUrl: string;
}

export const lti: LtiConfig = {
  toolBaseUrl: env("LTI_TOOL_URL", "https://cms.net.pe"),
  clientId: env("LTI_CLIENT_ID"),
  deploymentId: env("LTI_DEPLOYMENT_ID"),
  platformIssuer: env("LTI_PLATFORM_ISS", "https://canvas.instructure.com"),
  authUrl: env("LTI_AUTH_URL"),
  jwksUrl: env("LTI_JWKS_URL"),
  tokenUrl: env("LTI_TOKEN_URL"),
};

export function ltiEnabled(): boolean {
  return lti.clientId !== "" && lti.authUrl !== "" && lti.jwksUrl !== "";
}
