import "@testing-library/jest-dom/vitest";

globalThis.acquireVsCodeApi = () => ({
	postMessage: () => {},
	getState: () => undefined,
	setState: () => {},
});

Element.prototype.scrollIntoView = function () {};
