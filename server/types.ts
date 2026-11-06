export interface VercelRequest { method?: string; headers: Record<string, string | string[] | undefined>; body?: any; query?: Record<string, string | string[]> }
export interface VercelResponse { setHeader(name: string, value: string): unknown; status(code: number): VercelResponse; json(body: unknown): unknown; end(): unknown }
