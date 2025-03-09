import OptionsSync from 'webext-options-sync';

export enum SubsectionSortingMethod {
	Ascending = 'Ascending',
	Descending = 'Descending',
}

export type Options = {
	token: string;
	showSiblingPrs: boolean;
	subsectionSortingMethod: SubsectionSortingMethod;
};

export const optionsStorage = new OptionsSync({
	defaults: {
		token: 'Enter your token here',
		showSiblingPrs: true,
		subsectionSortingMethod: SubsectionSortingMethod.Descending,
	},
	migrations: [OptionsSync.migrations.removeUnused],
	logging: true,
});
