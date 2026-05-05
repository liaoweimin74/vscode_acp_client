type Listener<T = unknown> = (data: T) => void;

export class EventEmitter<Events extends object> {
	private listeners = new Map<string, Set<Listener>>();

	on<K extends string & keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		const set = this.listeners.get(event)!;
		set.add(listener as Listener);
		return () => this.off(event, listener);
	}

	off<K extends string & keyof Events>(event: K, listener: Listener<Events[K]>): void {
		const set = this.listeners.get(event);
		if (set) {
			set.delete(listener as Listener);
			if (set.size === 0) {
				this.listeners.delete(event);
			}
		}
	}

	emit<K extends string & keyof Events>(event: K, data: Events[K]): void {
		const set = this.listeners.get(event);
		if (set) {
			for (const listener of set) {
				(listener as Listener<Events[K]>)(data);
			}
		}
	}

	removeAllListeners(event?: string & keyof Events): void {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
	}
}
