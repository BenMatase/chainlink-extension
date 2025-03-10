import OptionsSync from 'webext-options-sync';

export enum SubsectionSortingMethod {
	Ascending = 'Ascending',
	Descending = 'Descending',
}

export type Options = {
	token: string;
	showSiblingPrs: boolean;
	subsectionSortingMethod: SubsectionSortingMethod;
	enableCache: boolean;
};

export const optionsStorage = new OptionsSync({
	defaults: {
		token: 'Enter your token here',
		showSiblingPrs: true,
		subsectionSortingMethod: SubsectionSortingMethod.Descending,
		enableCache: true,
	},
	migrations: [OptionsSync.migrations.removeUnused],
	logging: true,
});
