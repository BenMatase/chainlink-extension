import {type PrIdentifier, type Results} from './api.js';

function getDatabaseKey(prIdentifier: PrIdentifier): string {
	return `${prIdentifier.owner}/${prIdentifier.repo}/${prIdentifier.number}`;
}

export async function load(
	prIdentifier: PrIdentifier,
): Promise<Results | undefined> {
	const key = getDatabaseKey(prIdentifier);
	console.log('loading data for', key);
	migrateIfNecessary();

	return new Promise((resolve, reject) => {
		const request = indexedDB.open('chainlink-extension-db', 1);

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			if (!database.objectStoreNames.contains('storage')) {
				database.createObjectStore('storage');
			}
		};

		request.onsuccess = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			const transaction = database.transaction('storage', 'readonly');
			const store = transaction.objectStore('storage');
			const getRequest = store.get(key);

			getRequest.onsuccess = () => {
				if (getRequest.result === undefined) {
					resolve(undefined);
				}

                // have to store as string because indexedDB doesn't support cross-origin objects
				const results = JSON.parse(getRequest.result as string) as Results;
				resolve(results);
			};

			getRequest.addEventListener('error', () => {
				reject(
					new Error(getRequest.error?.message ?? 'Unknown error occurred'),
				);
			});
		};

		request.addEventListener('error', () => {
			reject(new Error(request.error?.message ?? 'Unknown error occurred'));
		});
	});
}

export async function store(
	prIdentifier: PrIdentifier,
	results: Results,
): Promise<void> {
    // have to store as string because indexedDB doesn't support cross-origin objects
	const data = JSON.stringify(results);

	const key = getDatabaseKey(prIdentifier);
	console.log('storing data for', key, 'with data', data);

	return new Promise((resolve, reject) => {
		const request = indexedDB.open('chainlink-extension-db', 1);

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			if (!database.objectStoreNames.contains('storage')) {
				database.createObjectStore('storage');
			}
		};

		request.onsuccess = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			const transaction = database.transaction('storage', 'readwrite');
			const store = transaction.objectStore('storage');
			const putRequest = store.put(data, key);

			putRequest.onsuccess = () => {
				resolve();
			};

			putRequest.addEventListener('error', () => {
				reject(
					new Error(putRequest.error?.message ?? 'Unknown error occurred'),
				);
			});
		};

		request.addEventListener('error', () => {
			reject(new Error(request.error?.message ?? 'Unknown error occurred'));
		});
	});
}

const localStorageRegex = /chainlink-(.*)\/(.*)\/(.*)/;

function matchLegacyLocalStorageKey(key: string): RegExpExecArray | undefined {
	return localStorageRegex.exec(key) ?? undefined;
}

// Only a one time hit
function migrateIfNecessary(): void {
	if (isLocalStorageMigrated()) {
		return;
	}

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key) {
			const match = matchLegacyLocalStorageKey(key);
			if (match === undefined) {
				console.log('key does not match regex', key);
				continue;
			}

			const value = localStorage.getItem(key);

			const prIdentifier = {
				owner: match[1],
				repo: match[2],
				number: Number.parseInt(match[3], 10),
			};

			const databaseKey = getDatabaseKey(prIdentifier);

			const storedResults = JSON.parse(value!) as Results;

			void store(prIdentifier, storedResults);

			console.log(
				'migration of localStorage key',
				key,
				'to indexDB key',
				databaseKey,
				'successful. Now removing from localstorage.',
			);

			localStorage.removeItem(key);
		}
	}

	setLocalStorageMigrated();
}

const localStorageMigratedKey = 'chainlink-migrated-to-indexdb';

function isLocalStorageMigrated(): boolean {
	const data = localStorage.getItem(localStorageMigratedKey);
	return data !== null && data === 'true';
}

function setLocalStorageMigrated() {
	localStorage.setItem(localStorageMigratedKey, 'true');
}
