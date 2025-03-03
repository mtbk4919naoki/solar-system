import SolarSystem from '@components/SolarSystem';

const appContainer: HTMLDivElement | null = document.querySelector('#app');
const indicator: HTMLDivElement | null = document.querySelector('#indicator');
const speedIndicator: HTMLDivElement | null = document.querySelector('#play-speed');
const helperIndicator: HTMLDivElement | null = document.querySelector('#helper-indicator');

if (appContainer && indicator && speedIndicator) {
  const solarSystem = new SolarSystem(appContainer, indicator, speedIndicator, helperIndicator);

  const nextButton: HTMLButtonElement | null = document.querySelector('#next');
  const prevButton: HTMLButtonElement | null = document.querySelector('#prev');
  const pauseButton: HTMLButtonElement | null = document.querySelector('#pause');
  const fasterButton: HTMLButtonElement | null = document.querySelector('#faster');
  const slowerButton: HTMLButtonElement | null = document.querySelector('#slower');
  const helperButton: HTMLButtonElement | null = document.querySelector('#helper');

  if (nextButton) nextButton.addEventListener('click', () => {
    solarSystem.nextCameraMode();
  });

  if (prevButton) prevButton.addEventListener('click', () => {
    solarSystem.prevCameraMode();
  });

  if (pauseButton) pauseButton.addEventListener('click', () => {
    solarSystem.togglePause();
  });

  if (fasterButton) fasterButton.addEventListener('click', () => {
    solarSystem.fasterFrameMultiplier();
  });

  if (slowerButton) slowerButton.addEventListener('click', () => {
    solarSystem.slowerFrameMultiplier();
  });

  if (helperButton) helperButton.addEventListener('click', () => {
    solarSystem.toggleHelper();
  });
}