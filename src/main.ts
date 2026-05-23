import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { initSettings } from './lib/stores/settings';

initSettings();

const app = mount(App, {
  target: document.getElementById('app')!
});

export default app;
