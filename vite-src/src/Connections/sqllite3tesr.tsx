// Replace sql.js-based DB with a simple JSON file-backed store using Neutralino filesystem.
const DB_PATH = "./storage/app.json";

let store: Record<string, any> = {}; // in-memory store

async function fileExists(path: string) {
	// @ts-ignore
	if (typeof window === "undefined" || !window.Neutralino) return false;
	try {
		// @ts-ignore
		const stat = await window.Neutralino.filesystem.stat(path);
		return !!stat;
	} catch {
		return false;
	}
}

export async function initDatabase() {
	// @ts-ignore
	if (typeof window === "undefined" || !window.Neutralino) {
		console.warn("Neutralino not available (running in browser mode) — using in-memory store only.");
		store = {};
		return;
	}

	try {
		const exists = await fileExists(DB_PATH);
		if (!exists) {
			// ensure storage directory exists
			// @ts-ignore
			await window.Neutralino.filesystem.createDirectory("./storage");
			store = {};
			await saveDatabase();
			console.log("Created new JSON DB at", DB_PATH);
			return;
		}

		// @ts-ignore
		const content = await window.Neutralino.filesystem.readFile(DB_PATH);
		store = content ? JSON.parse(content) : {};
		console.log("Loaded JSON DB from", DB_PATH);
	} catch (err) {
		console.warn("Failed to load JSON DB, starting with empty store.", err);
		store = {};
	}
}

export async function saveDatabase() {
	// @ts-ignore
	if (typeof window === "undefined" || !window.Neutralino) {
		console.warn("Neutralino not available — skipping save to disk (in-memory only).");
		return;
	}
	try {
		const data = JSON.stringify(store, null, 2);
		// @ts-ignore
		await window.Neutralino.filesystem.writeFile(DB_PATH, data);
	} catch (err) {
		console.error("Failed to save JSON DB:", err);
	}
}

// Simple helpers for collections (tables)
export function getRecords(collection: string) {
	if (!store[collection]) store[collection] = [];
	return store[collection];
}

export function addRecord(collection: string, record: any) {
	if (!store[collection]) store[collection] = [];
	// simple id assignment if none provided
	if (record && record.id == null) {
		const arr = store[collection];
		const maxId = arr.length ? Math.max(...arr.map((r: any) => r.id || 0)) : 0;
		record.id = maxId + 1;
	}
	store[collection].push(record);
	return record;
}

export function updateRecord(collection: string, id: any, changes: any) {
	const arr = getRecords(collection);
	const idx = arr.findIndex((r: any) => r.id === id);
	if (idx === -1) return null;
	arr[idx] = { ...arr[idx], ...changes };
	return arr[idx];
}

export function deleteRecord(collection: string, id: any) {
	const arr = getRecords(collection);
	const idx = arr.findIndex((r: any) => r.id === id);
	if (idx === -1) return false;
	arr.splice(idx, 1);
	return true;
}

// Deprecated SQL-compatible stubs — kept to avoid breaking callers that expect these names.
// They will throw to make it obvious SQL is no longer supported.
export function runQuery(_sql: string, _params = []) {
	throw new Error("runQuery is deprecated. Use getRecords/addRecord/updateRecord/deleteRecord instead.");
}

export function runExecute(_sql: string, _params = []) {
	throw new Error("runExecute is deprecated. Use addRecord/updateRecord/deleteRecord instead.");
}
