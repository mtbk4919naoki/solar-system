import SolarSystem from '@components/SolarSystem';

const appContainer: HTMLDivElement | null = document.querySelector('#app');
const indicator: HTMLDivElement | null = document.querySelector('#indicator');

if (appContainer && indicator) {
  const solarSystem = new SolarSystem(appContainer, indicator);

  const nextButton: HTMLButtonElement | null = document.querySelector('#next');
  const prevButton: HTMLButtonElement | null = document.querySelector('#prev');
  const pauseButton: HTMLButtonElement | null = document.querySelector('#pause');

  if (nextButton) nextButton.addEventListener('click', () => {
    solarSystem.nextCameraMode();
  });

  if (prevButton) prevButton.addEventListener('click', () => {
    solarSystem.prevCameraMode();
  });

  if (pauseButton) pauseButton.addEventListener('click', () => {
    solarSystem.togglePause();
  });
}