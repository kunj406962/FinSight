let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(newToken: string | null): void {
  token = newToken;
}

export function clearToken(): void {
  token = null;
}