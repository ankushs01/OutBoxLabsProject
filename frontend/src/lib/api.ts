// export class ApiError extends Error {
//   constructor(message: string, public status: number) {
//     super(message);
//   }
// }

// export async function api<T>(path: string, init?: RequestInit): Promise<T> {
//   const res = await fetch(path, {
//     credentials: "include",
//     headers: { "Content-Type": "application/json" },
//     ...init,
//   });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
//   return data as T;
// }


// New Updated code after Render Deployment by Cha


const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? `Request failed (${res.status})`,
      res.status
    );
  }

  return data as T;
}
