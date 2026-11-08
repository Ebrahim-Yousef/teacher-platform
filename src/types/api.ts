export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type RequestClient = <T = unknown>(
  path: string,
  options?: RequestInit & { body?: unknown },
) => Promise<ApiResponse<T>>;
