// The hooks a part draws the shared clock with (the clock is `../clock.ts`).
import { useCallback, useState, useSyncExternalStore } from "react";
import { createClock, pendingAttempt } from "../clock.ts";

const clock = createClock();

// What a part draws from the clock: `read` turns now into it, a string or a
// number (compared by identity), and the part renders again only when that
// changes. It ticks until `until` (epoch milliseconds), never past it.
export function useClock<T extends string | number>(
	read: (now: number) => T,
	until = Number.POSITIVE_INFINITY,
): T {
	const subscribe = useCallback(
		(hear: () => void) => clock.hold(hear, until),
		[until],
	);
	return useSyncExternalStore(subscribe, () => read(clock.now()));
}

// The attempt toward `until` and the clock's now. The shared clock ticks until the
// end, never past it; a moved `until` carries the attempt on from the share it
// reached. Unset, there is no attempt.
export function usePending(until: Date | undefined) {
	const end = until?.getTime();
	const now = useClock((at) => at, end ?? 0);
	const [attempt, setAttempt] = useState(() =>
		end === undefined ? undefined : pendingAttempt(end, now),
	);
	if (end !== undefined && attempt?.end !== end)
		setAttempt(pendingAttempt(end, now, attempt));
	return { end, attempt, now };
}
