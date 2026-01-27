export {}; // make this file a module and avoid polluting global scope accidentally

declare global {
	interface Window {
		Neutralino?: any;
	}
}
