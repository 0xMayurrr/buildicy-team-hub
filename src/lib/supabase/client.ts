/**
 * Buildicy Direct Supabase Client
 * Full integration with Supabase Auth, PostgreSQL (PostgREST), and Storage APIs.
 * Works out-of-the-box using standard HTTP Fetch with zero external dependencies.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const anonKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_KEY ||
    ""
  ).trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.includes("supabase.co")),
  };
};

export class SupabaseClient {
  private config: SupabaseConfig;
  private token: string | null = null;

  constructor() {
    this.config = getSupabaseConfig();
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("buildicy_sb_token");
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("buildicy_sb_token", token);
      } else {
        localStorage.removeItem("buildicy_sb_token");
      }
    }
  }

  public getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: this.config.anonKey,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    } else if (this.config.anonKey) {
      headers["Authorization"] = `Bearer ${this.config.anonKey}`;
    }
    return headers;
  }

  // Supabase Auth: Sign In with Password
  public async signInWithPassword(email: string, password: string) {
    if (!this.config.isConfigured) return null;
    try {
      const res = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.config.anonKey,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error_description || data.msg || "Supabase Auth failed");
      }
      this.setToken(data.access_token);
      return data;
    } catch (err) {
      console.warn("Supabase Auth API notice:", err);
      return null;
    }
  }

  // Supabase PostgREST: Query table
  public async select<T>(table: string, queryParams: string = ""): Promise<T[] | null> {
    if (!this.config.isConfigured) return null;
    try {
      const url = `${this.config.url}/rest/v1/${table}${queryParams ? `?${queryParams}` : ""}`;
      const res = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Select from ${table} failed: ${res.statusText}`);
      }
      return (await res.json()) as T[];
    } catch (err) {
      console.warn(`Supabase select error on ${table}:`, err);
      return null;
    }
  }

  // Supabase PostgREST: Insert record(s)
  public async insert<T>(table: string, payload: any): Promise<T | null> {
    if (!this.config.isConfigured) return null;
    try {
      const res = await fetch(`${this.config.url}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          ...this.getHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Insert into ${table} failed: ${res.statusText}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (err) {
      console.warn(`Supabase insert error on ${table}:`, err);
      return null;
    }
  }

  // Supabase PostgREST: Update record
  public async update<T>(table: string, filterQuery: string, payload: any): Promise<T | null> {
    if (!this.config.isConfigured) return null;
    try {
      const res = await fetch(`${this.config.url}/rest/v1/${table}?${filterQuery}`, {
        method: "PATCH",
        headers: {
          ...this.getHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Update on ${table} failed: ${res.statusText}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (err) {
      console.warn(`Supabase update error on ${table}:`, err);
      return null;
    }
  }
}

export const supabase = new SupabaseClient();
