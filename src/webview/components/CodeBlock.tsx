import { useMemo, useState } from "react";
import { hljs } from "../highlight";
import { t } from "../i18n";
import "highlight.js/styles/vs2015.css";
import "./CodeBlock.css";

interface CodeBlockProps {
	code: string;
	language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	const highlighted = useMemo(() => {
		try {
			if (language && hljs.getLanguage(language)) {
				return hljs.highlight(code, { language }).value;
			}
			return hljs.highlightAuto(code).value;
		} catch {
			return code;
		}
	}, [code, language]);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="acp-code-block">
			<div className="acp-code-block__header">
				<span className="acp-code-block__lang">{language ?? "text"}</span>
				<button
					type="button"
					className="acp-code-block__copy"
					onClick={handleCopy}
					title={t("code.copyCode")}
				>
					{copied ? (
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path
								d="M3 8L6.5 11.5L13 4.5"
								stroke="var(--acp-success)"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					) : (
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<rect
								x="5"
								y="5"
								width="9"
								height="9"
								rx="1.5"
								stroke="currentColor"
								strokeWidth="1.2"
							/>
							<path
								d="M11 5V3.5C11 2.67 10.33 2 9.5 2H3.5C2.67 2 2 2.67 2 3.5V9.5C2 10.33 2.67 11 3.5 11H5"
								stroke="currentColor"
								strokeWidth="1.2"
							/>
						</svg>
					)}
				</button>
			</div>
			<pre className="acp-code-block__pre">
				<code
					className={`acp-code-block__code hljs language-${language ?? "text"}`}
					dangerouslySetInnerHTML={{ __html: highlighted }}
				/>
			</pre>
		</div>
	);
}
