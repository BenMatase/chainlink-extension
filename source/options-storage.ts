import OptionsSync from 'webext-options-sync';

export type Options = {
	token: string;
	showSiblingPrs: boolean;
};

export const optionsStorage = new OptionsSync({
	defaults: {
		token: 'Enter your token here',
		showSiblingPrs: true,
	},
	migrations: [OptionsSync.migrations.removeUnused],
	logging: true,
});
