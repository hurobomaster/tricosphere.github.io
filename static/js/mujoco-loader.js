import loadMujoco from '../vendor/mujoco/mujoco.js';

export function getBasePath() {
  const pagesBase = '/tricosphere.github.io/';
  return window.location.pathname.startsWith(pagesBase) ? pagesBase : './';
}

export async function initMuJoCo() {
  const basePath = getBasePath();
  const mujoco = await loadMujoco();
  const xmlUrl = `${basePath}models/single_finger.xml`;
  const xmlText = await fetch(xmlUrl).then((res) => {
    if (!res.ok) {
      throw new Error(`single_finger.xml failed to load (${res.status}).`);
    }
    return res.text();
  });

  let model;
  if (mujoco.FS && mujoco.MjModel.mj_loadXML) {
    try {
      try {
        mujoco.FS.mkdir('/working');
      } catch (error) {
        if (!String(error).includes('File exists')) throw error;
      }
      mujoco.FS.writeFile('/working/single_finger.xml', xmlText);
      model = mujoco.MjModel.mj_loadXML('/working/single_finger.xml');
    } catch (error) {
      model = mujoco.MjModel.from_xml_string(xmlText);
    }
  } else {
    model = mujoco.MjModel.from_xml_string(xmlText);
  }

  const data = new mujoco.MjData(model);
  mujoco.mj_forward(model, data);

  return { mujoco, model, data, xmlUrl };
}
