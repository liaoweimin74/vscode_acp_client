import en from "./locales/en.json";
import zhCn from "./locales/zh-cn.json";
import zhTw from "./locales/zh-tw.json";

type LocaleKey = keyof typeof en;
type LocaleData = Record<string, string>;

const locales: Record<string, LocaleData> = {
	en: en as unknown as LocaleData,
	"zh-cn": zhCn as unknown as LocaleData,
	"zh-tw": zhTw as unknown as LocaleData,
};

let currentLocale = "en";

export function setLocale(locale: string): void {
	currentLocale = locales[locale] ? locale : "en";
}

export function getLocale(): string {
	return currentLocale;
}

export function t(key: LocaleKey, ...args: (string | number)[]): string {
	const localeData = locales[currentLocale] ?? locales.en;
	let value = localeData[key] ?? locales.en[key] ?? key;
	for (let i = 0; i < args.length; i++) {
		value = value.replace(`{${i}}`, String(args[i]));
	}
	return value;
}
