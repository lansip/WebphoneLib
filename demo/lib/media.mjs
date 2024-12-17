import { Media, Sound } from '../../dist/index.mjs';
import { client, getSessions } from './calling.mjs';
import { getDocumentElement } from './dom.mjs';
import { Logger } from './logging.mjs';

const logger = new Logger('media');

export const media = {
  input: {
    id: undefined,
    audioProcessing: true,
    volume: 1.0,
    muted: false
  },
  output: {
    id: undefined,
    volume: 1.0,
    muted: false
  }
};

const sound = new Sound('/demo/sounds/dtmf-0.mp3', { volume: 1.0, overlap: true });

async function requestAudioPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("Navegador não suporta dispositivos de mídia.");
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Permissão concedida");
  } catch (err) {
    console.error("Erro ao conceder permissão:", err);
  }
}

requestAudioPermission();

async function getAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (err) {
    console.error("Erro ao detectar dispositivos:", err);
    return [];
  }
}

function getSelectedOption(select) {
  return select && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : undefined;
}

function makeOptions(select, devices) {
  let selected = getSelectedOption(select);
  select.options.length = 0;

  devices.forEach(({ deviceId, label }) => {
    const option = document.createElement('option');
    option.value = deviceId;
    option.text = label || `Dispositivo Desconhecido (${deviceId})`;
    if (selected && option.value === selected.value) {
      option.selected = true;
      selected = undefined;
    }
    select.add(option);
  });

  if (selected) {
    logger.error(`Dispositivo selecionado removido: ${selected.text}`);
  }
}

function updateDevicesLists(mediaDevices, list) {
  list.innerHTML = '';
  mediaDevices.forEach(({ label }) => {
    const device = document.createElement('li');
    device.textContent = label || 'Dispositivo Desconhecido';
    list.appendChild(device);
  });
}

Media.on('permissionGranted', () => console.log('Permissão concedida pelo Media API'));
Media.on('permissionRevoked', () => console.log('Permissão revogada'));

export function setOndevicesChanged() {
  navigator.mediaDevices.addEventListener('devicechange', async () => {
    logger.info('Dispositivos mudaram');
    await setInputsAndOutputs();
  });
}

export async function setInputsAndOutputs() {
  const inputDevices = await getAudioDevices();
  makeOptions(getDocumentElement('inputSelect'), inputDevices);
  makeOptions(getDocumentElement('outputSelect'), Media.outputs);
  changeInputSelect(getDocumentElement('inputSelect'));
  changeOutputSelect(getDocumentElement('outputSelect'));
}

export function changeInputSelect(select) {
  const selected = getSelectedOption(select);
  if (selected) {
    getSessions().forEach(session => session.media.input.id = selected.value);
    client.defaultMedia.input.id = selected.value;
    logger.info(`Entrada alterada para: ${selected.text}`);
  }
}

export function changeOutputSelect(select) {
  const selected = getSelectedOption(select);
  if (selected) {
    getSessions().forEach(session => session.media.output.id = selected.value);
    client.defaultMedia.output.id = selected.value;
    logger.info(`Saída alterada para: ${selected.text}`);
  }
}

export function playSound() {
  const outputSelect = getDocumentElement('outputSelect');
  const selectedOption = getSelectedOption(outputSelect);
  if (selectedOption) {
    sound.sinkId = selectedOption.value;
    sound.play();
  } else {
    logger.error("Nenhum dispositivo de saída selecionado.");
  }
}

export function changeInputVolume(value) {
  const volume = value / 10;
  getSessions().forEach(session => session.media.input.volume = volume);
  client.defaultMedia.input.volume = volume;
  logger.info(`Volume de entrada alterado para: ${value}`);
}

export function changeInputMuted(checked) {
  getSessions().forEach(session => session.media.input.muted = checked);
  client.defaultMedia.input.muted = checked;
  logger.info(`Entrada mutada: ${checked}`);
}

export function changeOutputVolume(value) {
  const volume = value / 10;
  getSessions().forEach(session => session.media.output.volume = volume);
  client.defaultMedia.output.volume = volume;
  logger.info(`Volume de saída alterado para: ${value}`);
}

export function changeOutputMuted(checked) {
  getSessions().forEach(session => session.media.output.muted = checked);
  client.defaultMedia.output.muted = checked;
  logger.info(`Saída mutada: ${checked}`);
}

window.Media = Media;
Media.init();
