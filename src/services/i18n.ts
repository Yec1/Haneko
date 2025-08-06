import en from "../assets/languages/en.js";
import tw from "../assets/languages/tw.js";

interface LanguageStrings {
	[key: string]: string | ((options?: any, ...args: any[]) => any);
}

interface Languages {
	[key: string]: LanguageStrings;
}

const langs: Languages = { en: en as any, tw: tw as any };

/**
 * @description 創建翻譯器
 * @param lang - 語言
 * @returns 翻譯器
 */
export function createTranslator(lang: string) {
	if (!Object.keys(langs).includes(lang)) {
		lang = "tw";
		// throw new Error('No lang specified found!');
	}

	return function i18n(
		string: string,
		options?: Record<string, string>,
		...args: any[]
	): string {
		let str = langs[lang]?.[string] ?? langs["tw"]?.[string] ?? string;
		if (!str) return string;
		if (options)
			for (let [key, value] of Object.entries(options))
				str = (str as string).replace(`<${key}>`, `${value}`);
		if (args)
			for (let [index, value] of Object.entries(args))
				str = (str as string).replace(`%${index}%`, `${value}`);
		return str as string;
	};
}
