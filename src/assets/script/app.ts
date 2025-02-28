import SolarSystem from '@components/SolarSystem';

const appContainer = document.querySelector('#app');
if (appContainer) {
  new SolarSystem(appContainer);
}
