// eslint-disable-next-line import/no-unassigned-import
import 'webext-base-css';
import './options.css';
import {optionsStorage} from './options-storage.js';

async function init() {
	await optionsStorage.syncForm('#options-form');
}

const passwordInput = document.querySelector('#passwordInput');
const toggleVisibilityButton = document.querySelector('#toggleVisibility');

// Add click event listener to the toggle button
toggleVisibilityButton.addEventListener('mousedown', () => {
	// Change input type to text when button is pressed
	passwordInput.type = 'text';
});

toggleVisibilityButton.addEventListener('mouseup', () => {
	// Change input type back to password when button is released
	passwordInput.type = 'password';
});

// Also handle cases where mouse leaves the button
toggleVisibilityButton.addEventListener('mouseleave', () => {
	passwordInput.type = 'password';
});

init().catch((error: unknown) => {
	console.error(error);
});
