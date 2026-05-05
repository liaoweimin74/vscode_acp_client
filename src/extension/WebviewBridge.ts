import * as vscode from "vscode";
import type { ExtensionMessage, WebviewMessage } from "../shared/types/extension.js";

export class WebviewBridge {
	private panel: vscode.WebviewView | undefined;
	private readonly _onDidReceiveMessage = new vscode.EventEmitter<WebviewMessage>();
	readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

	constructor(private readonly extensionUri: vscode.Uri) {}

	setPanel(panel: vscode.WebviewView): void {
		this.panel = panel;

		this.panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
			this._onDidReceiveMessage.fire(msg);
		});
	}

	postMessage(message: ExtensionMessage): Thenable<boolean> {
		if (!this.panel) {
			return Promise.resolve(false);
		}
		return this.panel.webview.postMessage(message);
	}

	getWebviewHtml(): vscode.WebviewOptions {
		return {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist", "webview")],
		};
	}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.setPanel(webviewView);

		webviewView.webview.options = this.getWebviewHtml();

		const scriptUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "assets", "index.js"),
		);
		const styleUri = webviewView.webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "assets", "index.css"),
		);

		const nonce = getNonce();

		webviewView.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewView.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webviewView.webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>ACP Agent</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}

	dispose(): void {
		this._onDidReceiveMessage.dispose();
		this.panel = undefined;
	}
}

function getNonce(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}
