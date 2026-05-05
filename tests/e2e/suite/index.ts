import Mocha from "mocha";
import { resolve } from "node:path";

export function run(): Promise<void> {
	return new Promise((resolvePromise, reject) => {
		const mocha = new Mocha({
			ui: "bdd",
			timeout: 60_000,
			color: true,
		});

		mocha.addFile(resolve(__dirname, "extension.test"));

		mocha.run((failures) => {
			if (failures > 0) {
				reject(new Error(`${failures} tests failed.`));
			} else {
				resolvePromise();
			}
		});
	});
}