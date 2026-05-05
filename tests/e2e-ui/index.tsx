import { createRoot } from "react-dom/client";
import { App } from "../../src/webview/App";
import { useStore } from "../../src/webview/store";

(window as any).__store = useStore;

const rootEl = document.getElementById("root");
if (rootEl) {
	const root = createRoot(rootEl);
	root.render(<App />);
}
