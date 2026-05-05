import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

console.log("[webview] index.tsx loaded");

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
	state = { error: null as Error | null };
	static getDerivedStateFromError(error: Error) {
		return { error };
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[webview] RENDER ERROR:", error, info.componentStack);
	}
	render() {
		if (this.state.error) {
			return (
				<div style={{ padding: 16, color: "#f44", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap" }}>
					<h3>Render Error:</h3>
					<div>{this.state.error.message}</div>
					<div>{this.state.error.stack}</div>
				</div>
			);
		}
		return this.props.children;
	}
}

const rootEl = document.getElementById("root");
console.log("[webview] root element:", rootEl);

if (rootEl) {
	const root = createRoot(rootEl);
	root.render(
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	);
	console.log("[webview] App rendered");
} else {
	console.error("[webview] root element not found!");
}
