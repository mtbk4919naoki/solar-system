import SolarSystem from '@components/SolarSystem';

const appContainer: HTMLDivElement | null = document.querySelector('#app');
if (appContainer) new SolarSystem(appContainer);
