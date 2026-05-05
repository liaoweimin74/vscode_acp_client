import type { ExtensionMessage, WebviewMessage } from "@shared/types/extension";

declare function acquireVsCodeApi(): {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
};

interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}

let api: VsCodeApi | undefined;

function getApi(): VsCodeApi {
	if (!api) {
		api = acquireVsCodeApi() as VsCodeApi;
	}
	return api;
}

export function postMessage(msg: WebviewMessage): void {
	getApi().postMessage(msg);
}

export function onMessage(handler: (msg: ExtensionMessage) => void): () => void {
	const listener = (event: MessageEvent<ExtensionMessage>) => {
		if (event.data && typeof event.data.type === "string") {
			handler(event.data);
		}
	};
	window.addEventListener("message", listener);
	return () => window.removeEventListener("message", listener);
}

export function getVsCodeState(): unknown {
	return getApi().getState();
}

export function setVsCodeState(state: unknown): void {
	getApi().setState(state);
}
