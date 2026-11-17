import type { LifeTip } from "../../data/life-tips";

type Options = { dataDir?: string; now?: () => number; env?: NodeJS.ProcessEnv };
export function handleLifeTipsRequest(request: Request, defaults: LifeTip[], options?: Options): Promise<Response>;
