import { test, expect } from "@playwright/test";

test.describe("Webview UI", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector(".acp-app");
	});

	test("renders empty state when no session", async ({ page }) => {
		await expect(page.locator(".acp-content__empty")).toBeVisible();
		await expect(page.locator(".acp-content__empty p")).toContainText("Create a new session to start chatting");
	});

	test("renders agent selector with Select Agent when no agents", async ({ page }) => {
		await expect(page.locator(".acp-agent-selector__label")).toContainText("Select Agent");
	});

	test("textarea is disabled when no active session", async ({ page }) => {
		const textarea = page.locator(".acp-prompt__textarea");
		await expect(textarea).toBeDisabled();
		await expect(textarea).toHaveAttribute("placeholder", "Create or select a session first");
	});

	test("slash command menu opens on / input", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({ activeSession: "ses_1" });
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/");
		await expect(page.locator(".acp-slash-menu")).toBeVisible();
		await expect(page.locator(".acp-slash-menu__item").first()).toContainText("/help");
	});

	test("/sessions opens session dropdown", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					sessions: [
						{ id: "ses_1", title: "Chat 1", messageCount: 5, createdAt: 1000, updatedAt: 3000 },
						{ id: "ses_2", title: "Chat 2", messageCount: 1, createdAt: 2000, updatedAt: 2000 },
					],
				});
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/sessions");
		await textarea.press("Enter");
		await expect(page.locator(".acp-session-dropdown")).toBeVisible();
		await expect(page.locator(".acp-session-selector")).toBeVisible();
		await expect(page.locator(".acp-session-selector__item").first()).toContainText("New Session");
	});

	test("/models opens model dropdown", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "gpt-4",
							options: [
								{ name: "GPT-4", value: "gpt-4" },
								{ name: "Claude 3", value: "claude-3" },
							],
						},
					],
				});
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/models");
		await textarea.press("Enter");
		await expect(page.locator(".acp-popup-backdrop")).toBeVisible();
		await expect(page.locator(".acp-model-dropdown")).toBeVisible();
		await expect(page.locator(".acp-model-selector__item").first()).toContainText("GPT-4");
	});

	test("command popup closes on Escape", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "gpt-4",
							options: [{ name: "GPT-4", value: "gpt-4" }],
						},
					],
				});
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/models");
		await textarea.press("Enter");
		await expect(page.locator(".acp-popup-backdrop")).toBeVisible();
		await page.locator(".acp-popup-backdrop").press("Escape");
		await expect(page.locator(".acp-popup-backdrop")).not.toBeVisible();
	});

	test("command popup closes on backdrop click", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "gpt-4",
							options: [{ name: "GPT-4", value: "gpt-4" }],
						},
					],
				});
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/models");
		await textarea.press("Enter");
		await expect(page.locator(".acp-popup-backdrop")).toBeVisible();
		await page.locator(".acp-popup-backdrop").click({ position: { x: 5, y: 5 } });
		await expect(page.locator(".acp-popup-backdrop")).not.toBeVisible();
	});

	test("session switching in dropdown sends message", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					sessions: [
						{ id: "ses_1", title: "Chat 1", messageCount: 5, createdAt: 1000, updatedAt: 3000 },
						{ id: "ses_2", title: "Chat 2", messageCount: 1, createdAt: 2000, updatedAt: 2000 },
					],
				});
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/sessions");
		await textarea.press("Enter");
		await expect(page.locator(".acp-session-dropdown")).toBeVisible();

		const messagesBefore = await page.evaluate(() => (window as any).__mockMessages.length);
		await page.locator(".acp-session-selector__item").filter({ hasText: "Chat 2" }).click();
		await expect(page.locator(".acp-session-dropdown")).not.toBeVisible();

		const messagesAfter = await page.evaluate(() => (window as any).__mockMessages);
		expect(messagesAfter.length).toBeGreaterThan(messagesBefore);
		const switchMsg = messagesAfter.find((m: any) => m.type === "switch_session");
		expect(switchMsg).toBeTruthy();
		expect(switchMsg.sessionId).toBe("ses_2");
	});

	test("model switching in dropdown sends set_config", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "gpt-4",
							options: [
								{ name: "GPT-4", value: "gpt-4" },
								{ name: "Claude 3", value: "claude-3" },
							],
						},
					],
				});
			}
		});
		await page.waitForTimeout(100);

		const textarea = page.locator(".acp-prompt__textarea");
		await textarea.click();
		await textarea.fill("/models");
		await textarea.press("Enter");
		await expect(page.locator(".acp-popup-backdrop")).toBeVisible();

		await page.locator(".acp-model-selector__item").filter({ hasText: "Claude 3" }).click();
		await expect(page.locator(".acp-popup-backdrop")).not.toBeVisible();

		const messages = await page.evaluate(() => (window as any).__mockMessages);
		const configMsg = messages.find((m: any) => m.type === "set_config");
		expect(configMsg).toBeTruthy();
		expect(configMsg.configId).toBe("model");
		expect(configMsg.value).toBe("claude-3");
	});

	test("messages display in message list", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				const messages = new Map();
				messages.set("ses_1", [
					{ id: "m1", sessionId: "ses_1", role: "user", content: "Hello", timestamp: 1000 },
					{ id: "m2", sessionId: "ses_1", role: "assistant", content: "Hi there!", timestamp: 1001 },
				]);
				store.setState({
					activeSession: "ses_1",
					messages,
				});
			}
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-message-item").first()).toBeVisible();
		await expect(page.locator(".acp-message-item__role").first()).toContainText("You");
		await expect(page.locator(".acp-message-item__role").nth(1)).toContainText("Assistant");
	});

	test("config bar shows model and role selectors in lazy session mode (activeAgent set, activeSession null)", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeAgent: "opencode",
					activeSession: null,
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "claude-sonnet-4-20250514",
							options: [
								{ name: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
								{ name: "GPT-4o", value: "gpt-4o" },
							],
						},
						{
							id: "thought_level",
							category: "thought_level",
							type: "select",
							currentValue: "medium",
							options: [
								{ name: "Low", value: "low" },
								{ name: "Medium", value: "medium" },
								{ name: "High", value: "high" },
							],
						},
					],
					agentRoles: [
						{ id: "code", name: "Code", description: "Code mode" },
						{ id: "ask", name: "Ask", description: "Ask mode" },
					],
					activeRole: "code",
				});
			}
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-config-bar")).toBeVisible();
		await expect(page.locator(".acp-config-bar__btn").first()).toBeVisible();
		await expect(page.locator(".acp-role-selector")).toBeVisible();
	});

	test("config bar shows selectors after state_update with activeAgent but no activeSession", async ({ page }) => {
		await page.evaluate(() => {
			window.postMessage({
				type: "state_update",
				state: {
					activeAgent: "opencode",
					activeSession: null,
					agents: [{ config: { id: "opencode", name: "OpenCode" }, status: "connected" }],
					sessions: [],
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "claude-sonnet-4-20250514",
							options: [
								{ name: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
								{ name: "GPT-4o", value: "gpt-4o" },
							],
						},
					],
					connectionError: null,
					agentRoles: [
						{ id: "code", name: "Code", description: "Code mode" },
						{ id: "ask", name: "Ask", description: "Ask mode" },
					],
					activeRole: "code",
				},
			}, "*");
		});
		await page.waitForTimeout(200);

		await expect(page.locator(".acp-config-bar")).toBeVisible();
		await expect(page.locator(".acp-role-selector")).toBeVisible();
		const modelBtn = page.locator(".acp-config-bar__btn").first();
		await expect(modelBtn).toBeVisible();
		await expect(modelBtn).toContainText("Claude Sonnet 4");
	});

	test("config bar survives multiple state_updates (lazy session connect flow)", async ({ page }) => {
		await page.evaluate(() => {
			const msgs = [
				{
					type: "state_update",
					state: {
						activeAgent: "opencode",
						activeSession: null,
						agents: [{ config: { id: "opencode", name: "OpenCode" }, status: "connected" }],
						sessions: [],
						configOptions: [],
						connectionError: null,
						agentRoles: [],
						activeRole: null,
					},
				},
				{
					type: "state_update",
					state: {
						activeAgent: "opencode",
						activeSession: null,
						agents: [{ config: { id: "opencode", name: "OpenCode" }, status: "connected" }],
						sessions: [],
						configOptions: [],
						connectionError: null,
						agentRoles: [],
						activeRole: null,
					},
				},
				{
					type: "state_update",
					state: {
						activeAgent: "opencode",
						activeSession: null,
						agents: [{ config: { id: "opencode", name: "OpenCode" }, status: "connected" }],
						sessions: [],
						configOptions: [
							{
								id: "model",
								category: "model",
								type: "select",
								currentValue: "claude-sonnet-4-20250514",
								options: [
									{ name: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
									{ name: "GPT-4o", value: "gpt-4o" },
								],
							},
						],
						connectionError: null,
						agentRoles: [],
						activeRole: null,
					},
				},
				{
					type: "state_update",
					state: {
						activeAgent: "opencode",
						activeSession: null,
						agents: [{ config: { id: "opencode", name: "OpenCode" }, status: "connected" }],
						sessions: [],
						configOptions: [
							{
								id: "model",
								category: "model",
								type: "select",
								currentValue: "claude-sonnet-4-20250514",
								options: [
									{ name: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
									{ name: "GPT-4o", value: "gpt-4o" },
								],
							},
						],
						connectionError: null,
						agentRoles: [
							{ id: "code", name: "Code", description: "Code mode" },
							{ id: "ask", name: "Ask", description: "Ask mode" },
						],
						activeRole: "code",
					},
				},
			];
			let delay = 0;
			for (const msg of msgs) {
				setTimeout(() => window.postMessage(msg, "*"), delay);
				delay += 50;
			}
		});
		await page.waitForTimeout(400);

		await expect(page.locator(".acp-config-bar")).toBeVisible();
		await expect(page.locator(".acp-role-selector")).toBeVisible();
		const modelBtn = page.locator(".acp-config-bar__btn").first();
		await expect(modelBtn).toBeVisible();
		await expect(modelBtn).toContainText("Claude Sonnet 4");
	});

	test("config bar cleared when empty state_update arrives after config set", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeAgent: "opencode",
					activeSession: null,
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "claude-sonnet-4-20250514",
							options: [{ name: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" }],
						},
					],
					agentRoles: [{ id: "code", name: "Code", description: "Code mode" }],
					activeRole: "code",
				});
			}
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-config-bar")).toBeVisible();
		await expect(page.locator(".acp-role-selector")).toBeVisible();

		await page.evaluate(() => {
			window.postMessage({
				type: "state_update",
				state: {
					activeAgent: "opencode",
					activeSession: null,
					agents: [{ config: { id: "opencode", name: "OpenCode" }, status: "connected" }],
					sessions: [],
					configOptions: [],
					connectionError: null,
					agentRoles: [],
					activeRole: null,
				},
			}, "*");
		});
		await page.waitForTimeout(200);

		await expect(page.locator(".acp-role-selector")).not.toBeVisible();
		await expect(page.locator(".acp-config-bar__btn").first()).not.toBeVisible();
	});

	test("config bar hidden when no activeAgent even with configOptions", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeAgent: null,
					activeSession: null,
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "gpt-4",
							options: [{ name: "GPT-4", value: "gpt-4" }],
						},
					],
				});
			}
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-config-bar")).not.toBeVisible();
	});

	test("config bar shows model dropdown", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					configOptions: [
						{
							id: "model",
							category: "model",
							type: "select",
							currentValue: "gpt-4",
							options: [{ name: "GPT-4", value: "gpt-4" }],
						},
					],
				});
			}
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-config-bar__btn").first()).toBeVisible();
		await expect(page.locator(".acp-config-bar__btn").first()).toContainText("GPT-4");
	});

	test("message persistence via getState/setState", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				const messages = new Map();
				messages.set("ses_1", [
					{ id: "m1", sessionId: "ses_1", role: "user", content: "Persist test", timestamp: 1000 },
				]);
				store.setState({
					activeSession: "ses_1",
					messages,
				});
			}
		});
		await page.waitForTimeout(200);

		const state = await page.evaluate(() => (window as any).__mockState);
		expect(state).toBeTruthy();
		expect(state.messages).toHaveLength(1);
		expect(state.messages[0][0]).toBe("ses_1");
		expect(state.messages[0][1][0].content).toBe("Persist test");
	});

	test("reconnect button appears on connection error", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({
					activeSession: "ses_1",
					connectionError: "disconnected",
					reconnectFailed: true,
				});
			}
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-prompt__error")).toBeVisible();
		await expect(page.locator(".acp-prompt__reconnect-btn")).toBeVisible();
		await expect(page.locator(".acp-prompt__reconnect-btn")).toContainText("Reconnect");
	});

	test("session_messages populates messages on session switch", async ({ page }) => {
		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				const messages = new Map();
				messages.set("ses_1", [
					{ id: "m1", sessionId: "ses_1", role: "user", content: "Chat 1 msg", timestamp: 1000 },
				]);
				store.setState({ activeSession: "ses_1", messages });
			}
		});
		await page.waitForTimeout(100);

		await page.evaluate(() => {
			const store = (window as any).__store;
			if (store) {
				store.setState({ activeSession: "ses_2" });
			}
		});
		await page.waitForTimeout(100);
		await expect(page.locator(".acp-message-list__empty")).toBeVisible();

		await page.evaluate(() => {
			window.postMessage({
				type: "session_messages",
				sessionId: "ses_2",
				messages: [
					{ id: "m2", sessionId: "ses_2", role: "user", content: "Chat 2 msg", timestamp: 2000 },
					{ id: "m3", sessionId: "ses_2", role: "assistant", content: "Reply", timestamp: 2001 },
				],
			}, "*");
		});
		await page.waitForTimeout(100);

		await expect(page.locator(".acp-message-item")).toHaveCount(2);
		await expect(page.locator(".acp-message-item").first()).toContainText("Chat 2 msg");
	});
});